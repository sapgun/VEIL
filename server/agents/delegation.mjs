import { randomUUID } from "node:crypto";
import { address } from "@solana/kit";
import { createPaymentService, MAX_LAMPORTS } from "../solana/payments.mjs";
import { check, exact, digest, publicAgentKey, verifyAgentRequest } from "./protocol.mjs";

function lamports(value, limit = MAX_LAMPORTS) {
  check(typeof value === "string" && /^[1-9][0-9]{0,15}$/.test(value) && BigInt(value) <= limit,
    "Invalid lamport amount or limit");
  return BigInt(value);
}

export function createDelegationService({ core, transport, store, now = Date.now }) {
  const agents = store.collection("agents");
  const offers = store.collection("offers");
  const seen = store.collection("agent-nonces");
  const requests = store.collection("agent-payments");
  function persona(context) {
    const state = core.snapshot();
    check(state.root && state.root.status !== "REVOKED", "Active VEIL root required");
    const p = state.personas.find((p) => p.context === context);
    check(p && !p.revoked && now() < p.mandateExpiresAt, "Active VEIL persona required");
    return p;
  }
  function activeOffer(id, agentId, accepted = true) {
    const offer = offers.get(id);
    check(offer && offer.policy.agentId === agentId, "Unknown agent mandate");
    check(offer.status !== "revoked" && now() < offer.policy.expiresAt, "Mandate revoked or expired");
    check(agents.get(agentId)?.status === "connected", "Agent is not connected or is revoked");
    check(persona(offer.policy.context).id === offer.policy.persona, "VEIL identity changed");
    if (accepted) check(offer.status === "accepted", "Agent must accept the exact mandate first");
    check(digest(offer.policy) === offer.policyDigest, "Stored policy integrity check failed");
    return offer;
  }
  const payments = createPaymentService({ core, transport, now, storage: store.payments,
    guard: (intent) => {
      const offer = offers.values().find((o) => o.engineMandateId === intent.mandateId);
      check(offer, "Payment has no delegation mandate");
      activeOffer(offer.policy.id, offer.policy.agentId);
    } });

  function authenticate(envelope, action, payloadFields, connecting = false) {
    const agent = agents.get(envelope?.message?.agentId ?? "");
    check(agent && agent.status !== "revoked", "Unknown or revoked agent");
    if (!connecting) check(agent.status === "connected", "Agent must prove key possession first");
    const message = verifyAgentRequest(envelope, agent.publicKey, store.audience, action, now());
    exact(message.payload, payloadFields);
    const hash = digest(message);
    const id = `${agent.id}:${message.requestId}`;
    store.transaction(() => {
      const previous = seen.get(id);
      check(!previous || previous.digest === hash, "Request ID reused with different signed contents");
      if (!previous) {
        check(seen.size < 10000, "Agent request storage limit reached");
        seen.set(id, { digest: hash, action });
      }
    });
    return { agent, message, id };
  }
  function publish(id, receipt) {
    // Release only a provable pre-broadcast failure. Unknown/included outcomes,
    // confirmed payments and interrupted preparation keep their reservation.
    return store.transaction(() => {
      const row = requests.get(id);
      check(row, "Unknown agent payment");
      if (!row.released && receipt.status === "failed" && !receipt.signature) {
        const offer = offers.get(row.offerId);
        offer.reservedLamports = (BigInt(offer.reservedLamports) - BigInt(row.lamports)).toString();
        offers.set(row.offerId, offer);
        row.released = true;
      }
      requests.set(id, row);
      return { requestId: row.requestId, receipt };
    });
  }
  return {
    info: () => ({ audience: store.audience, protocol: "VEIL-AGENT-v1", network: "solana:devnet",
      authority: "local-agent-delegation", persistence: "sqlite", privacy: "public-transfer" }),
    register(input) {
      exact(input, ["name", "publicKey"]);
      check(typeof input.name === "string" && input.name.trim().length > 0 && input.name.length <= 80, "Invalid agent name");
      publicAgentKey(input.publicKey);
      return store.transaction(() => {
        check(agents.size < 200, "Agent storage limit reached");
        check(!agents.values().some((a) => digest(a.publicKey) === digest(input.publicKey)), "Agent key already registered; explicit owner action required");
        const agent = { id: randomUUID(), name: input.name, publicKey: input.publicKey,
          status: "invited", challenge: randomUUID(), expiresAt: now() + 60000 };
        agents.set(agent.id, agent);
        return { agentId: agent.id, audience: store.audience, challenge: agent.challenge,
          expiresAt: agent.expiresAt, publicKeyDigest: digest(agent.publicKey) };
      });
    },
    connect(envelope) {
      const { agent, message } = authenticate(envelope, "agent.connect", ["challenge"], true);
      return store.transaction(() => {
        const current = agents.get(agent.id);
        check(current.status === "invited" && now() < current.expiresAt &&
          message.payload.challenge === current.challenge, "Invitation consumed or expired");
        current.status = "connected"; delete current.challenge;
        agents.set(current.id, current);
        return { agentId: current.id, status: "connected" };
      });
    },
    revokeAgent(id) {
      const agent = agents.get(id); check(agent, "Unknown agent");
      agent.status = "revoked"; delete agent.challenge; agents.set(id, agent);
      return { agentId: id, status: "revoked" };
    },
    offer(input) {
      exact(input, ["agentId", "context", "recipient", "maxLamports", "totalBudgetLamports", "ttlMs", "consent"]);
      check(input.consent === true, "Explicit owner consent required");
      check(agents.get(input.agentId)?.status === "connected", "Connected agent required");
      const p = persona(input.context);
      address(input.recipient);
      check(input.recipient !== transport.payer, "Recipient must differ from payer");
      const cap = lamports(input.maxLamports);
      check(lamports(input.totalBudgetLamports, 100000000n) >= cap, "Total budget must cover the per-request cap");
      check(Number.isSafeInteger(input.ttlMs) && input.ttlMs > 0 && input.ttlMs <= 60000, "Mandate TTL must be 1–60000 ms");
      check(offers.size < 500, "Mandate storage limit reached");
      const policy = { protocol: "VEIL-MANDATE-v1", audience: store.audience, id: randomUUID(),
        agentId: input.agentId, agentKeyDigest: digest(agents.get(input.agentId).publicKey),
        context: input.context, persona: p.id, payer: transport.payer,
        network: "solana:devnet", asset: "SOL", recipient: input.recipient,
        maxLamports: input.maxLamports, totalBudgetLamports: input.totalBudgetLamports,
        issuedAt: now(), expiresAt: Math.min(now() + input.ttlMs, p.mandateExpiresAt) };
      const offer = { policy, policyDigest: digest(policy), status: "offered", reservedLamports: "0" };
      offers.set(policy.id, offer);
      return structuredClone(offer);
    },
    inbox(envelope) {
      const { agent } = authenticate(envelope, "agent.inbox", []);
      return { offers: offers.values().filter((o) => o.policy.agentId === agent.id) };
    },
    accept(envelope) {
      const { agent, message } = authenticate(envelope, "mandate.accept", ["mandateId", "policyDigest"]);
      return store.transaction(() => {
        const offer = activeOffer(message.payload.mandateId, agent.id, false);
        check(message.payload.policyDigest === offer.policyDigest, "Agent acceptance policy mismatch");
        if (offer.status === "accepted") return structuredClone(offer);
        const engine = payments.grant({ context: offer.policy.context, recipient: offer.policy.recipient,
          maxLamports: offer.policy.maxLamports, ttlMs: offer.policy.expiresAt - now(), consent: true });
        offer.status = "accepted"; offer.engineMandateId = engine.id;
        offer.acceptance = structuredClone(envelope);
        offers.set(offer.policy.id, offer);
        return structuredClone(offer);
      });
    },
    revokeMandate(id) {
      const offer = offers.get(id); check(offer, "Unknown mandate");
      offer.status = "revoked"; offers.set(id, offer);
      if (offer.engineMandateId) payments.revoke(offer.engineMandateId);
      return { mandateId: id, status: "revoked" };
    },
    async pay(envelope) {
      const { agent, message, id } = authenticate(envelope, "payment.request",
        ["mandateId", "policyDigest", "network", "asset", "payer", "recipient", "lamports"]);
      const row = store.transaction(() => {
        const existing = requests.get(id);
        if (existing) return existing;
        const offer = activeOffer(message.payload.mandateId, agent.id);
        const p = message.payload; const policy = offer.policy;
        check(p.policyDigest === offer.policyDigest && p.network === policy.network &&
          p.asset === policy.asset && p.payer === policy.payer && p.recipient === policy.recipient, "Payment policy scope mismatch");
        const n = lamports(p.lamports);
        check(n <= BigInt(policy.maxLamports), "Payment exceeds per-request cap");
        check(BigInt(offer.reservedLamports) + n <= BigInt(policy.totalBudgetLamports), "Cumulative budget exceeded");
        const intent = payments.createIntent({ mandateId: offer.engineMandateId, lamports: p.lamports });
        // The agent request's own expiry is an additional execution deadline.
        intent.expiresAt = Math.min(intent.expiresAt, message.expiresAt);
        const { digest: previousDigest, ...boundIntent } = intent;
        intent.digest = digest(boundIntent);
        store.payments.intents.set(intent.id, intent);
        offer.reservedLamports = (BigInt(offer.reservedLamports) + n).toString();
        offers.set(policy.id, offer);
        const created = { agentId: agent.id, requestId: message.requestId, intentId: intent.id,
          offerId: policy.id, lamports: p.lamports, released: false };
        requests.set(id, created); return created;
      });
      let receipt;
      try { receipt = await payments.execute(row.intentId); }
      catch {
        receipt = store.payments.intents.get(row.intentId);
        if (receipt.status === "authorized") {
          receipt.status = "failed"; receipt.error = "Authority rejected before transaction preparation";
          store.payments.intents.set(row.intentId, receipt);
        }
      }
      return publish(id, receipt);
    },
    async status(envelope) {
      const { agent, message } = authenticate(envelope, "payment.status", ["requestId"]);
      check(typeof message.payload.requestId === "string", "Payment request ID required");
      const id = `${agent.id}:${message.payload.requestId}`;
      const row = requests.get(id); check(row, "Unknown agent payment");
      return publish(id, await payments.refresh(row.intentId));
    },
  };
}
