import { generateKeyPairSync } from "node:crypto";
import { generateKeyPairSigner, getTransactionDecoder, getSignatureFromTransaction } from "@solana/kit";
import { createCore } from "../server/core.mjs";
import { createApp } from "../server/http.mjs";
import { createAgentStore } from "../server/agents/store.mjs";
import { createDelegationService } from "../server/agents/delegation.mjs";
import { createSolanaTransport, DEVNET_GENESIS } from "../server/solana/transport.mjs";
import { createAgentClient } from "../client/agent.mjs";

// Offline lifecycle demo: real Ed25519 signatures and Kit wire transactions;
// injected RPC responses only. No network RPC, wallet funding or broadcast.
const result = (value) => ({ send: async () => value });
const rpc = {
  getGenesisHash: () => result(DEVNET_GENESIS),
  getLatestBlockhash: () => result({ value: { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 100n } }),
  simulateTransaction: () => result({ value: { err: null } }),
  sendTransaction: (wire) => result(getSignatureFromTransaction(getTransactionDecoder().decode(Buffer.from(wire, "base64")))),
  getSignatureStatuses: () => result({ value: [{ err: null, confirmationStatus: "confirmed" }] }),
};
const transport = createSolanaTransport({ signer: await generateKeyPairSigner(), rpc, provider: "OFFLINE-MOCK-RPC" });
const core = createCore();
const store = createAgentStore();
const delegation = createDelegationService({ core, transport, store });
const app = createApp(core, { delegation });
await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${app.address().port}`;
try {
  const { token } = await (await fetch(`${baseUrl}/api/session`)).json();
  const owner = async (route, data = {}) => {
    const response = await fetch(`${baseUrl}/api/owner/${route}`, { method: "POST",
      headers: { "Content-Type": "application/json", "X-Veil-Session": token }, body: JSON.stringify(data) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
    return value;
  };
  await owner("setup");
  const keys = generateKeyPairSync("ed25519");
  const invitation = await owner("agents/register", { name: "Example external agent", publicKey: keys.publicKey.export({ format: "jwk" }) });
  const agent = createAgentClient({ privateKey: keys.privateKey, invitation, baseUrl });
  console.log("OFFLINE DEMO — no real transaction is broadcast");
  console.log("1. Agent proved key possession:", (await agent.connect()).status);
  await owner("agents/offer", { agentId: invitation.agentId, context: "api",
    recipient: (await generateKeyPairSigner()).address, maxLamports: "2000", totalBudgetLamports: "5000", ttlMs: 60000, consent: true });
  const { offers: [offer] } = await agent.inbox();
  agent.inspect(offer);
  console.log("2. Agent received mandate:", { cap: offer.policy.maxLamports, budget: offer.policy.totalBudgetLamports, status: offer.status });
  console.log("3. Agent explicitly accepted:", (await agent.accept(offer)).status);
  const request = agent.createPaymentRequest(offer, "1000");
  const paid = await agent.submit(request);
  console.log("4. Signed request executed with MOCK RPC:", paid.receipt.status);
  console.log("5. Same request retry:", (await agent.submit(request)).receipt.id === paid.receipt.id ? "same intent" : "ERROR");
  console.log("6. Authenticated status:", (await agent.status(request.message.requestId)).receipt.status);
  await owner("agents/revoke-mandate", { mandateId: offer.policy.id });
  let rejected = false;
  try { await agent.submit(agent.createPaymentRequest(offer, "1000")); }
  catch { rejected = true; }
  if (!rejected) throw new Error("Revoked mandate unexpectedly executed");
  console.log("7. Payment after owner revocation: rejected");
} finally {
  app.closeAllConnections();
  await new Promise((resolve) => app.close(resolve));
  store.close();
}
