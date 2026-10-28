import { createHash, randomUUID } from "node:crypto";
import { address } from "@solana/kit";

export const MAX_LAMPORTS = 10_000_000n; // 0.01 Devnet SOL per request.
const MAX_TTL = 60_000;
const copy = (v) => structuredClone(v);
function check(condition, message) { if (!condition) throw new Error(message); }
function amount(value) {
  check(typeof value === "string" && /^[1-9][0-9]{0,7}$/.test(value), "Lamports must be a positive decimal string");
  const n = BigInt(value);
  check(n <= MAX_LAMPORTS, "Devnet payment exceeds 0.01 SOL limit");
  return n;
}

/** Owner-authorized local prototype. The existing Midnight circuits do not
 * attest these payment policies or enforce them on Solana. */
export function createPaymentService({ core, transport, now = Date.now, storage, guard = () => {} }) {
  const mandates = storage?.mandates ?? new Map();
  const intents = storage?.intents ?? new Map();
  function authority(context) {
    const state = core.snapshot();
    check(state.root && state.root.status !== "REVOKED", "Active VEIL root required");
    const p = state.personas.find((p) => p.context === context);
    check(p && !p.revoked, "Active VEIL persona required");
    check(now() < p.mandateExpiresAt, "VEIL persona mandate expired");
    return p;
  }
  function validate(intent) {
    const m = mandates.get(intent.mandateId);
    check(m && !m.revoked, "Payment mandate revoked or missing");
    const p = authority(m.context);
    check(p.id === m.persona, "VEIL identity changed; create a new mandate");
    check(now() < m.expiresAt && now() < intent.expiresAt, "Payment authorization expired");
    check(intent.payer === transport.payer && intent.recipient === m.recipient &&
      intent.network === "solana:devnet" && intent.asset === "SOL" &&
      amount(intent.lamports) <= BigInt(m.maxLamports), "Payment scope mismatch");
    guard(intent);
  }
  const receipt = (intent) => copy(intent);
  return {
    info: () => ({ enabled: true, network: "solana:devnet", payer: transport.payer,
      provider: transport.provider, asset: "SOL", maxLamports: MAX_LAMPORTS.toString(),
      authority: "local-owner-policy", privacy: "public-transfer" }),
    grant({ context, recipient, maxLamports, ttlMs, consent }) {
      check(consent === true, "Explicit payment consent required");
      const p = authority(context);
      const destination = address(recipient);
      check(destination !== transport.payer, "Recipient must differ from payer");
      amount(maxLamports);
      check(Number.isSafeInteger(ttlMs) && ttlMs > 0 && ttlMs <= MAX_TTL, "TTL must be 1–60000 milliseconds");
      check(mandates.size < 200, "Restart the local demo before creating more mandates");
      const mandate = { id: randomUUID(), context, persona: p.id, payer: transport.payer,
        recipient: destination, maxLamports, expiresAt: Math.min(now() + ttlMs, p.mandateExpiresAt), revoked: false };
      mandates.set(mandate.id, mandate);
      return copy(mandate);
    },
    revoke(id) {
      const mandate = mandates.get(id);
      check(mandate, "Unknown payment mandate");
      mandate.revoked = true;
      mandates.set(id, mandate);
      return copy(mandate);
    },
    createIntent({ mandateId, lamports }) {
      amount(lamports);
      const m = mandates.get(mandateId);
      check(m, "Unknown payment mandate");
      check(intents.size < 500, "Restart the local demo before creating more intents");
      const intent = { id: randomUUID(), mandateId, network: "solana:devnet", asset: "SOL",
        payer: transport.payer, recipient: m.recipient, lamports, expiresAt: m.expiresAt,
        status: "authorized", signature: null, createdAt: now() };
      validate(intent);
      // Local correlation digest, not a ZK proof or on-chain commitment.
      intent.digest = createHash("sha256").update(JSON.stringify(intent)).digest("hex");
      intents.set(intent.id, intent);
      return receipt(intent);
    },
    async execute(id) {
      let intent = intents.get(id);
      check(intent, "Unknown payment intent");
      // Reserve synchronously, before any await. Repeated calls never re-sign or
      // re-submit; uncertain broadcasts must be reconciled by signature.
      if (intent.status !== "authorized") return receipt(intent);
      validate(intent);
      if (intents.reserve) {
        intent = intents.reserve(id);
        if (!intent) return receipt(intents.get(id));
      } else {
        intent.status = "preparing";
        intents.set(id, intent);
      }
      let broadcasting = false;
      try {
        await transport.assertDevnet();
        validate(intent);
        const prepared = await transport.prepare(copy(intent));
        validate(intent);
        await transport.simulate(prepared);
        validate(intent);
        // No await between this final policy check and starting submission.
        intent.signature = prepared.signature;
        intent.lastValidBlockHeight = prepared.lastValidBlockHeight.toString();
        intent.status = "submitted";
        // Persist the signature before entering the uncertain broadcast boundary.
        intents.set(id, intent);
        broadcasting = true;
        await transport.submit(prepared);
      } catch {
        intent.status = broadcasting ? "unknown" : "failed";
        intent.error = broadcasting
          ? "Submission outcome uncertain; reconcile this signature. Do not create a replacement payment."
          : "Payment preparation or policy validation failed; no transaction submitted.";
        intents.set(id, intent);
        return receipt(intent);
      }
      return this.refresh(id);
    },
    async refresh(id) {
      const intent = intents.get(id);
      check(intent, "Unknown payment intent");
      if (intent.signature && ["submitted", "unknown", "confirmed"].includes(intent.status)) {
        try {
          const status = await transport.status(intent.signature);
          if (status !== "pending") { intent.status = status; delete intent.error; }
          intents.set(id, intent);
        } catch { /* Retain uncertainty; do not claim success or retry payment. */ }
      }
      return receipt(intent);
    },
  };
}
