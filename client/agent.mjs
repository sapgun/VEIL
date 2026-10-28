import { createPublicKey, randomUUID } from "node:crypto";
import { PROTOCOL, check, digest, signAgentRequest } from "../server/agents/protocol.mjs";

/** Minimal external-agent client: it owns an agent signing key, never an owner
 * session token, Helius API key or Solana payer private key. */
export function createAgentClient({ privateKey, invitation, baseUrl, now = Date.now }) {
  const publicKey = createPublicKey(privateKey).export({ format: "jwk" });
  function inspect(offer) {
    const p = offer?.policy;
    check(p && digest(p) === offer.policyDigest && p.audience === invitation.audience &&
      p.agentId === invitation.agentId && p.agentKeyDigest === digest(publicKey), "Offer identity or digest mismatch");
    check(p.protocol === "VEIL-MANDATE-v1" && p.network === "solana:devnet" &&
      p.asset === "SOL" && now() < p.expiresAt, "Unsupported or expired mandate");
    return p;
  }
  function envelope(action, payload, deadline = now() + 60000) {
    return signAgentRequest(privateKey, { protocol: PROTOCOL, audience: invitation.audience,
      action, agentId: invitation.agentId, requestId: randomUUID(), issuedAt: now(),
      expiresAt: Math.min(now() + 60000, deadline), payload });
  }
  async function post(route, body) {
    const response = await fetch(new URL(`/api/agent/${route}`, baseUrl), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    check(response.ok, result.error ?? "Agent API request failed");
    return result;
  }
  return {
    inspect,
    connect: () => post("connect", envelope("agent.connect", { challenge: invitation.challenge }, invitation.expiresAt)),
    inbox: () => post("inbox", envelope("agent.inbox", {})),
    accept(offer) {
      const p = inspect(offer);
      return post("accept", envelope("mandate.accept", { mandateId: p.id, policyDigest: offer.policyDigest }, p.expiresAt));
    },
    createPaymentRequest(offer, lamports) {
      const p = inspect(offer);
      return envelope("payment.request", { mandateId: p.id, policyDigest: offer.policyDigest,
        network: p.network, asset: p.asset, payer: p.payer, recipient: p.recipient, lamports }, p.expiresAt);
    },
    submit: (signedRequest) => post("pay", signedRequest),
    status: (requestId) => post("status", envelope("payment.status", { requestId })),
  };
}
