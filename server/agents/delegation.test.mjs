import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSigner } from "@solana/kit";
import { createCore } from "../core.mjs";
import { createApp } from "../http.mjs";
import { createAgentStore } from "./store.mjs";
import { createDelegationService } from "./delegation.mjs";
import { PROTOCOL, signAgentRequest } from "./protocol.mjs";
import { createAgentClient } from "../../client/agent.mjs";

const cleanups = [];
afterEach(async () => { for (const fn of cleanups.splice(0).reverse()) await fn(); });
async function fixture({ persistent = false } = {}) {
  let time = Date.now(); const now = () => time;
  const core = createCore({ now }); core.setup();
  const transport = { payer: (await generateKeyPairSigner()).address, provider: "test",
    assertDevnet: vi.fn(async () => {}), prepare: vi.fn(async () => ({ signature: randomUUID(), lastValidBlockHeight: 100n })),
    simulate: vi.fn(async () => {}), submit: vi.fn(async () => {}), status: vi.fn(async () => "confirmed") };
  let path = ":memory:";
  if (persistent) {
    const dir = mkdtempSync(join(tmpdir(), "veil-agents-"));
    path = join(dir, "agents.sqlite"); cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  }
  let store = createAgentStore(path);
  let service = createDelegationService({ core, transport, store, now });
  cleanups.push(() => store.close());
  const keys = generateKeyPairSync("ed25519");
  const invitation = service.register({ name: "external agent", publicKey: keys.publicKey.export({ format: "jwk" }) });
  const message = (action, payload, override = {}, signingKey = keys.privateKey) => signAgentRequest(signingKey, {
    protocol: PROTOCOL, audience: invitation.audience, agentId: invitation.agentId,
    requestId: randomUUID(), issuedAt: now(), expiresAt: now() + 60000, action, payload, ...override,
  });
  const connect = () => service.connect(message("agent.connect", { challenge: invitation.challenge }));
  const offer = (extra = {}) => service.offer({ agentId: invitation.agentId, context: "api",
    recipient: "11111111111111111111111111111111", maxLamports: "2000", totalBudgetLamports: "3000", ttlMs: 60000, consent: true, ...extra });
  const accept = (o) => service.accept(message("mandate.accept", { mandateId: o.policy.id, policyDigest: o.policyDigest }));
  const pay = (o, amount = "1000", extra = {}, override = {}) => message("payment.request", {
    mandateId: o.policy.id, policyDigest: o.policyDigest, network: "solana:devnet", asset: "SOL",
    payer: transport.payer, recipient: o.policy.recipient, lamports: amount, ...extra,
  }, override);
  return { core, transport, invitation, message, connect, offer, accept, pay, now, path,
    get service() { return service; }, get store() { return store; },
    advance: (ms) => { time += ms; },
    reopen() { store.close(); store = createAgentStore(path); service = createDelegationService({ core, transport, store, now }); },
    keys };
}
describe("external agent authority", () => {
  it("requires actual key possession and a single-use challenge", async () => {
    const f = await fixture();
    expect(() => f.service.inbox(f.message("agent.inbox", {}))).toThrow(/possession/);
    const wrong = generateKeyPairSync("ed25519");
    expect(() => f.service.connect(f.message("agent.connect", { challenge: f.invitation.challenge }, {}, wrong.privateKey))).toThrow(/signature/);
    expect(() => f.service.connect(f.message("agent.connect", { challenge: "wrong" }))).toThrow(/Invitation/);
    const e = f.message("agent.connect", { challenge: f.invitation.challenge });
    expect(f.service.connect(e).status).toBe("connected");
    expect(() => f.service.connect(e)).toThrow(/consumed/);
    expect(() => f.service.register({ name: "replacement", publicKey: f.keys.publicKey.export({ format: "jwk" }) })).toThrow(/already registered/);
  });
  it("delivers an offer and requires signed acceptance of the exact policy", async () => {
    const f = await fixture(); f.connect(); const o = f.offer();
    expect(f.service.inbox(f.message("agent.inbox", {})).offers[0].policyDigest).toBe(o.policyDigest);
    await expect(f.service.pay(f.pay(o))).rejects.toThrow(/accept/);
    expect(() => f.service.accept(f.message("mandate.accept", { mandateId: o.policy.id, policyDigest: "changed" }))).toThrow(/mismatch/);
    expect(f.accept(o).status).toBe("accepted");
    expect((await f.service.pay(f.pay(o))).receipt.status).toBe("confirmed");
  });
  it.each(["audience", "protocol", "payload", "signature", "extra-field", "future", "expired"])("rejects signed envelope %s tampering", async (kind) => {
    const f = await fixture(); f.connect(); const o = f.offer(); f.accept(o);
    let e = f.pay(o);
    if (kind === "audience") e = f.pay(o, "1000", {}, { audience: "different-server" });
    if (kind === "protocol") e = f.pay(o, "1000", {}, { protocol: "OTHER" });
    if (kind === "payload") e.message.payload.lamports = "1";
    if (kind === "signature") e.signature = "a".repeat(86);
    if (kind === "extra-field") e.message.inject = true;
    if (kind === "future") e = f.pay(o, "1000", {}, { issuedAt: Date.now() + 3600000 });
    if (kind === "expired") f.advance(60000);
    await expect(f.service.pay(e)).rejects.toThrow();
    expect(f.transport.submit).not.toHaveBeenCalled();
  });
  it.each([
    { network: "mainnet" }, { asset: "USDC" }, { payer: "wrong" },
    { recipient: "wrong" }, { policyDigest: "wrong" }, { injected: true },
  ])("rejects payment scope %j", async (extra) => {
    const f = await fixture(); f.connect(); const o = f.offer(); f.accept(o);
    await expect(f.service.pay(f.pay(o, "1000", extra))).rejects.toThrow();
    expect(f.transport.submit).not.toHaveBeenCalled();
  });
  it.each(["0", "01", "-1", "1.5", "2001", 1000])("rejects malformed or over-cap amount %s", async (n) => {
    const f = await fixture(); f.connect(); const o = f.offer(); f.accept(o);
    await expect(f.service.pay(f.pay(o, n))).rejects.toThrow();
  });
  it.each(["agent", "mandate", "persona", "root", "reset"])("enforces %s revocation", async (kind) => {
    const f = await fixture(); f.connect(); const o = f.offer(); f.accept(o); const e = f.pay(o);
    if (kind === "agent") f.service.revokeAgent(f.invitation.agentId);
    if (kind === "mandate") f.service.revokeMandate(o.policy.id);
    if (kind === "persona") f.core.revoke("api");
    if (kind === "root") f.core.revoke("root");
    if (kind === "reset") { f.core.reset(); f.core.setup(); }
    await expect(f.service.pay(e)).rejects.toThrow();
    expect(f.transport.submit).not.toHaveBeenCalled();
  });
  it("rechecks revocation after asynchronous preparation and releases an unsent reservation", async () => {
    const f = await fixture(); f.connect(); const o = f.offer(); f.accept(o);
    f.transport.simulate.mockImplementation(async () => { f.service.revokeMandate(o.policy.id); });
    expect((await f.service.pay(f.pay(o))).receipt.status).toBe("failed");
    expect(f.transport.submit).not.toHaveBeenCalled();
    expect(f.store.collection("offers").get(o.policy.id).reservedLamports).toBe("0");
  });
  it("enforces the agent request expiry after asynchronous simulation", async () => {
    const f = await fixture(); f.connect(); const o = f.offer(); f.accept(o);
    const e = f.pay(o, "1000", {}, { expiresAt: Date.now() + 1000 });
    f.transport.simulate.mockImplementation(async () => f.advance(2000));
    expect((await f.service.pay(e)).receipt.status).toBe("failed");
    expect(f.transport.submit).not.toHaveBeenCalled();
  });
  it("atomically reserves cumulative budget for distinct racing requests", async () => {
    const f = await fixture(); f.connect(); const o = f.offer(); f.accept(o);
    const results = await Promise.allSettled([f.service.pay(f.pay(o, "2000")), f.service.pay(f.pay(o, "2000"))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(f.transport.submit).toHaveBeenCalledTimes(1);
    expect(f.store.collection("offers").get(o.policy.id).reservedLamports).toBe("2000");
  });
  it("deduplicates concurrent retry and rejects mutation under a reused request ID", async () => {
    const f = await fixture(); f.connect(); const o = f.offer(); f.accept(o); const e = f.pay(o);
    const [a, b] = await Promise.all([f.service.pay(e), f.service.pay(e)]);
    expect(a.receipt.id).toBe(b.receipt.id); expect(f.transport.submit).toHaveBeenCalledTimes(1);
    await expect(f.service.pay(f.pay(o, "500", {}, { requestId: e.message.requestId }))).rejects.toThrow(/reused/);
  });
  it("persists acceptance, budget and retry identity across restart", async () => {
    const f = await fixture({ persistent: true }); f.connect(); const o = f.offer(); f.accept(o);
    const e = f.pay(o, "2000"); const first = await f.service.pay(e);
    f.reopen();
    expect(f.service.info().audience).toBe(f.invitation.audience);
    const retry = await f.service.pay(e);
    expect(retry.receipt.id).toBe(first.receipt.id);
    await expect(f.service.pay(f.pay(o, "2000"))).rejects.toThrow(/budget/);
    expect(f.transport.submit).toHaveBeenCalledTimes(1);
  });
  it("retains ambiguous submission budget and reconciles after restart without resend", async () => {
    const f = await fixture({ persistent: true }); f.connect(); const o = f.offer(); f.accept(o);
    f.transport.submit.mockRejectedValue(new Error("api-key=hidden"));
    const e = f.pay(o, "2000");
    expect((await f.service.pay(e)).receipt.status).toBe("unknown");
    f.reopen();
    await expect(f.service.pay(f.pay(o, "2000"))).rejects.toThrow(/budget/);
    const status = await f.service.status(f.message("payment.status", { requestId: e.message.requestId }));
    expect(status.receipt.status).toBe("confirmed"); expect(JSON.stringify(status)).not.toContain("hidden");
    expect(f.transport.submit).toHaveBeenCalledTimes(1);
  });
  it("keeps an interrupted preparation reserved and does not restart it", async () => {
    const f = await fixture({ persistent: true }); f.connect(); const o = f.offer(); f.accept(o);
    const e = f.pay(o, "2000");
    // Emulate a process dying after durable reservation and before a broadcast.
    f.transport.prepare.mockImplementation(async () => {
      const row = f.store.collection("agent-payments").get(`${f.invitation.agentId}:${e.message.requestId}`);
      expect(f.store.payments.intents.get(row.intentId).status).toBe("preparing");
      throw Error("preparation failed");
    });
    const result = await f.service.pay(e);
    // A known pre-broadcast failure can safely release the reservation.
    expect(result.receipt.status).toBe("failed");
    const intent = f.store.payments.intents.get(result.receipt.id);
    intent.status = "preparing"; f.store.payments.intents.set(intent.id, intent);
    const offer = f.store.collection("offers").get(o.policy.id); offer.reservedLamports = "2000";
    f.store.collection("offers").set(o.policy.id, offer);
    f.reopen();
    expect((await f.service.pay(e)).receipt.status).toBe("preparing");
    expect(f.transport.submit).not.toHaveBeenCalled();
    expect(f.store.collection("offers").get(o.policy.id).reservedLamports).toBe("2000");
  });
  it("permits owner reconciliation after agent revocation but denies other-agent status", async () => {
    const f = await fixture(); f.connect(); const o = f.offer(); f.accept(o);
    const e = f.pay(o); await f.service.pay(e);
    f.service.revokeAgent(f.invitation.agentId);
    await expect(f.service.status(f.message("payment.status", { requestId: e.message.requestId }))).rejects.toThrow(/revoked/);
    expect((await f.service.ownerStatus({ agentId: f.invitation.agentId, requestId: e.message.requestId })).receipt.status).toBe("confirmed");
    await expect(f.service.ownerStatus({ agentId: randomUUID(), requestId: e.message.requestId })).rejects.toThrow(/Unknown/);
  });
  it("rejects private agent keys and expired possession challenges", async () => {
    const f = await fixture();
    expect(() => f.service.register({ name: "secret", publicKey: f.keys.privateKey.export({ format: "jwk" }) })).toThrow(/fields/);
    f.advance(60000);
    expect(() => f.connect()).toThrow(/expired/);
  });
  it("rejects a freshly signed request after the mandate deadline", async () => {
    const f = await fixture(); f.connect(); const o = f.offer({ ttlMs: 1000 }); f.accept(o);
    f.advance(1000);
    await expect(f.service.pay(f.pay(o))).rejects.toThrow(/expired/);
  });
  it("keeps receipts isolated to the signing agent", async () => {
    const f = await fixture(); f.connect(); const o = f.offer(); f.accept(o);
    const e = f.pay(o); await f.service.pay(e);
    const keys = generateKeyPairSync("ed25519");
    const inv = f.service.register({ name: "second", publicKey: keys.publicKey.export({ format: "jwk" }) });
    const signed = (action, payload) => signAgentRequest(keys.privateKey, {
      protocol: PROTOCOL, audience: inv.audience, agentId: inv.agentId,
      requestId: randomUUID(), issuedAt: f.now(), expiresAt: f.now() + 60000, action, payload });
    f.service.connect(signed("agent.connect", { challenge: inv.challenge }));
    expect(f.service.inbox(signed("agent.inbox", {})).offers).toEqual([]);
    await expect(f.service.status(signed("payment.status", { requestId: e.message.requestId }))).rejects.toThrow(/Unknown/);
    expect(() => f.service.accept(signed("mandate.accept", { mandateId: o.policy.id, policyDigest: o.policyDigest }))).toThrow(/Unknown/);
  });
  it("releases only unsent failures once and retains included-failure budget", async () => {
    const f = await fixture(); f.connect(); const o = f.offer(); f.accept(o);
    f.transport.simulate.mockRejectedValueOnce(Error("simulation failed"));
    const e = f.pay(o, "2000");
    expect((await f.service.pay(e)).receipt.status).toBe("failed");
    await f.service.status(f.message("payment.status", { requestId: e.message.requestId }));
    expect(f.store.collection("offers").get(o.policy.id).reservedLamports).toBe("0");
    f.transport.status.mockResolvedValue("failed");
    const next = await f.service.pay(f.pay(o, "2000"));
    expect(next.receipt.signature).toBeTruthy();
    expect(next.receipt.status).toBe("failed");
    expect(f.store.collection("offers").get(o.policy.id).reservedLamports).toBe("2000");
  });
  it("uses durable reservation across two executor instances sharing the database", async () => {
    const f = await fixture({ persistent: true }); f.connect(); const o = f.offer(); f.accept(o);
    const secondStore = createAgentStore(f.path);
    cleanups.push(() => secondStore.close());
    const other = createDelegationService({ core: f.core, transport: f.transport, store: secondStore, now: f.now });
    const e = f.pay(o, "2000");
    const result = await Promise.all([f.service.pay(e), other.pay(e)]);
    expect(result[0].receipt.id).toBe(result[1].receipt.id);
    expect(f.transport.submit).toHaveBeenCalledTimes(1);
    expect(secondStore.collection("offers").get(o.policy.id).reservedLamports).toBe("2000");
  });
});

describe("external-agent HTTP client", () => {
  it("completes registration, offer delivery, acceptance, payment and revoke rejection without an owner token in agent calls", async () => {
    const f = await fixture();
    const app = createApp(f.core, { delegation: f.service });
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    cleanups.push(() => new Promise((resolve) => { app.closeAllConnections(); app.close(resolve); }));
    const baseUrl = `http://127.0.0.1:${app.address().port}`;
    const { token } = await (await fetch(`${baseUrl}/api/session`)).json();
    const post = (path, body, owner = false) => fetch(`${baseUrl}/api/${path}`, { method: "POST",
      headers: { "Content-Type": "application/json", ...(owner ? { "X-Veil-Session": token } : {}) }, body: JSON.stringify(body) });
    expect((await post("owner/agents/offer", {})).status).toBe(401);
    expect((await post("agent/inbox", {})).status).toBe(400);
    const keys = generateKeyPairSync("ed25519");
    const invitation = await (await post("owner/agents/register", {
      name: "HTTP registered agent", publicKey: keys.publicKey.export({ format: "jwk" }),
    }, true)).json();
    const client = createAgentClient({ privateKey: keys.privateKey, invitation, baseUrl, now: f.now });
    await client.connect();
    const offer = await (await post("owner/agents/offer", { agentId: invitation.agentId,
      context: "api", recipient: "11111111111111111111111111111111", maxLamports: "2000",
      totalBudgetLamports: "3000", ttlMs: 60000, consent: true }, true)).json();
    expect((await client.inbox()).offers[0].policyDigest).toBe(offer.policyDigest);
    await client.accept(offer);
    const request = client.createPaymentRequest(offer, "1000");
    const result = await client.submit(request);
    expect(result.receipt.status).toBe("confirmed");
    expect((await client.status(request.message.requestId)).receipt.id).toBe(result.receipt.id);
    expect(JSON.stringify(result)).not.toMatch(/wire|api-key|privateKey|rootSecret/);
    await post("owner/agents/revoke-mandate", { mandateId: offer.policy.id }, true);
    await expect(client.submit(client.createPaymentRequest(offer, "1000"))).rejects.toThrow(/revoked/);
  });
});
