import { describe, it, expect, vi } from "vitest";
import { createPublicKey, verify } from "node:crypto";
import {
  generateKeyPairSigner, getTransactionDecoder, getSignatureFromTransaction,
  getCompiledTransactionMessageDecoder, decompileTransactionMessage, getAddressEncoder,
} from "@solana/kit";
import { parseTransferSolInstruction } from "@solana-program/system";
import { createCore } from "../core.mjs";
import { createPaymentService } from "./payments.mjs";
import { createSolanaTransport, DEVNET_GENESIS, solanaConfig } from "./transport.mjs";

export async function fixture() {
  let time = Date.now();
  const now = () => time;
  const core = createCore({ now });
  core.setup();
  const signer = await generateKeyPairSigner();
  const recipient = (await generateKeyPairSigner()).address;
  const request = (value) => ({ send: vi.fn(async () => value) });
  const rpc = {
    getGenesisHash: vi.fn(() => request(DEVNET_GENESIS)),
    getLatestBlockhash: vi.fn(() => request({ value: {
      blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 100n,
    } })),
    simulateTransaction: vi.fn(() => request({ value: { err: null } })),
    sendTransaction: vi.fn((wire) => request(getSignatureFromTransaction(
      getTransactionDecoder().decode(Buffer.from(wire, "base64")),
    ))),
    getSignatureStatuses: vi.fn(() => request({ value: [{ err: null, confirmationStatus: "confirmed" }] })),
  };
  const transport = createSolanaTransport({ signer, rpc, provider: "helius" });
  const service = createPaymentService({ core, transport, now });
  const grant = (extra = {}) => service.grant({ context: "api", recipient,
    maxLamports: "10000", ttlMs: 60000, consent: true, ...extra });
  const intent = (m = grant(), lamports = "1000") => service.createIntent({ mandateId: m.id, lamports });
  return { core, signer, recipient, rpc, transport, service, grant, intent,
    advance: (ms) => { time += ms; }, request };
}

describe("Solana Devnet payments", () => {
  it("builds one correctly signed SOL transfer and reconciles confirmation", async () => {
    const f = await fixture();
    const intent = f.intent();
    const result = await f.service.execute(intent.id);
    expect(result.status).toBe("confirmed");
    expect(result.digest).toBe(intent.digest);
    const wire = f.rpc.simulateTransaction.mock.calls[0][0];
    expect(f.rpc.sendTransaction.mock.calls[0][0]).toBe(wire);
    const tx = getTransactionDecoder().decode(Buffer.from(wire, "base64"));
    const publicKey = createPublicKey({ format: "jwk", key: { kty: "OKP", crv: "Ed25519",
      x: Buffer.from(getAddressEncoder().encode(f.signer.address)).toString("base64url") } });
    expect(verify(null, tx.messageBytes, publicKey, tx.signatures[f.signer.address])).toBe(true);
    const message = decompileTransactionMessage(getCompiledTransactionMessageDecoder().decode(tx.messageBytes));
    expect(message.instructions).toHaveLength(1);
    const transfer = parseTransferSolInstruction(message.instructions[0]);
    expect(transfer.accounts.source.address).toBe(f.signer.address);
    expect(transfer.accounts.destination.address).toBe(f.recipient);
    expect(transfer.data.amount).toBe(1000n);
    expect(JSON.stringify(result)).not.toMatch(/wire|privateKey|api-key/);
  });
  it.each(["0", "-1", "1.5", "01", "10000001", 1000, null])("rejects malformed amount %s", async (lamports) => {
    const f = await fixture();
    expect(() => f.intent(f.grant(), lamports)).toThrow();
    expect(f.rpc.sendTransaction).not.toHaveBeenCalled();
  });
  it("requires consent, a valid recipient, and bounded TTL", async () => {
    const f = await fixture();
    expect(() => f.grant({ consent: false })).toThrow(/consent/);
    expect(() => f.grant({ recipient: "invalid" })).toThrow();
    expect(() => f.grant({ recipient: f.signer.address })).toThrow(/differ/);
    expect(() => f.grant({ ttlMs: 60001 })).toThrow(/TTL/);
  });
  it("rejects over-cap requests and ignores caller-injected recipient/network fields", async () => {
    const f = await fixture();
    const m = f.grant();
    expect(() => f.intent(m, "10001")).toThrow(/scope/);
    const intent = f.service.createIntent({ mandateId: m.id, lamports: "1000", recipient: f.signer.address, network: "mainnet" });
    expect(intent.recipient).toBe(f.recipient);
    expect(intent.network).toBe("solana:devnet");
    intent.lamports = "99999999";
    expect((await f.service.execute(intent.id)).lamports).toBe("1000");
  });
  it.each(["expiry", "payment-revoke", "persona-revoke", "root-revoke", "reset"])("rejects %s before signing", async (reason) => {
    const f = await fixture();
    const m = f.grant(); const intent = f.intent(m);
    if (reason === "expiry") f.advance(60000);
    if (reason === "payment-revoke") f.service.revoke(m.id);
    if (reason === "persona-revoke") f.core.revoke("api");
    if (reason === "root-revoke") f.core.revoke("root");
    if (reason === "reset") { f.core.reset(); f.core.setup(); }
    await expect(f.service.execute(intent.id)).rejects.toThrow();
    expect(f.rpc.getLatestBlockhash).not.toHaveBeenCalled();
    expect(f.rpc.sendTransaction).not.toHaveBeenCalled();
  });
  it("rechecks revocation after asynchronous simulation", async () => {
    const f = await fixture();
    f.rpc.simulateTransaction.mockImplementation(() => ({ send: async () => {
      f.core.revoke("api"); return { value: { err: null } };
    } }));
    expect((await f.service.execute(f.intent().id)).status).toBe("failed");
    expect(f.rpc.sendTransaction).not.toHaveBeenCalled();
  });
  it("blocks a non-Devnet RPC before preparing a transaction", async () => {
    const f = await fixture();
    f.rpc.getGenesisHash.mockImplementation(() => f.request("mainnet-genesis"));
    expect((await f.service.execute(f.intent().id)).status).toBe("failed");
    expect(f.rpc.getLatestBlockhash).not.toHaveBeenCalled();
  });
  it("does not broadcast a failed simulation", async () => {
    const f = await fixture();
    f.rpc.simulateTransaction.mockImplementation(() => f.request({ value: { err: { InstructionError: [0, "failure"] } } }));
    expect((await f.service.execute(f.intent().id)).status).toBe("failed");
    expect(f.rpc.sendTransaction).not.toHaveBeenCalled();
  });
  it("reserves concurrent execution and never resubmits the same intent", async () => {
    const f = await fixture(); const intent = f.intent();
    await Promise.all([f.service.execute(intent.id), f.service.execute(intent.id)]);
    await f.service.execute(intent.id);
    expect(f.rpc.sendTransaction).toHaveBeenCalledTimes(1);
  });
  it("retains signature after ambiguous submission and reconciles without resending", async () => {
    const f = await fixture(); const intent = f.intent();
    f.rpc.sendTransaction.mockImplementation(() => ({ send: async () => { throw new Error("https://host/?api-key=secret"); } }));
    const result = await f.service.execute(intent.id);
    expect(result.status).toBe("unknown"); expect(result.signature).toBeTruthy();
    expect(JSON.stringify(result)).not.toContain("secret");
    expect((await f.service.execute(intent.id)).status).toBe("unknown");
    expect((await f.service.refresh(intent.id)).status).toBe("confirmed");
    expect(f.rpc.sendTransaction).toHaveBeenCalledTimes(1);
  });
  it("distinguishes pending, failed, confirmed and finalized outcomes", async () => {
    const f = await fixture(); const intent = f.intent();
    f.rpc.getSignatureStatuses.mockImplementation(() => f.request({ value: [null] }));
    expect((await f.service.execute(intent.id)).status).toBe("submitted");
    f.rpc.getSignatureStatuses.mockImplementation(() => f.request({ value: [{ err: { InstructionError: [0, 1] }, confirmationStatus: "confirmed" }] }));
    expect((await f.service.refresh(intent.id)).status).toBe("failed");
    const next = f.intent();
    f.rpc.getSignatureStatuses.mockImplementation(() => f.request({ value: [{ err: null, confirmationStatus: "finalized" }] }));
    expect((await f.service.execute(next.id)).status).toBe("finalized");
  });
  it("chooses Helius only from a server-side key and exposes no endpoint", () => {
    expect(DEVNET_GENESIS).toBe("EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG");
    expect(solanaConfig({}).rpcUrl).toBe("https://api.devnet.solana.com");
    expect(solanaConfig({ HELIUS_API_KEY: "test key" }).rpcUrl).toBe("https://devnet.helius-rpc.com/?api-key=test%20key");
  });
});
