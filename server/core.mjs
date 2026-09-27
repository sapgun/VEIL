import {
  createHmac,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  sign,
  verify,
} from "node:crypto";

export const CONTEXTS = Object.freeze({
  daily: {
    name: "DAILY",
    label: "Merchant / POS",
    action: "purchase",
    target: "cafe.veil.demo",
    limit: 50,
    amount: 12,
    glyph: "◒",
  },
  api: {
    name: "API",
    label: "Paid API",
    action: "api-call",
    target: "api.veil.demo",
    limit: 10,
    amount: 2,
    glyph: "⌘",
  },
  defi: {
    name: "DEFI",
    label: "DeFi sandbox",
    action: "swap",
    target: "dex.veil.demo",
    limit: 100,
    amount: 25,
    glyph: "◇",
  },
});
export const TTL = 60_000;
export const SCHEME = "VEIL-LOCAL-ATTESTATION-v1";
const clone = (value) => structuredClone(value);
function check(condition, message) {
  if (!condition) throw new Error(message);
}
export function derivePersona(secret, context) {
  check(Object.hasOwn(CONTEXTS, context), "Unknown context");
  return (
    "vp_" +
    createHmac("sha256", secret)
      .update(`VEIL/persona/v1/${context}/${CONTEXTS[context].target}`)
      .digest("hex")
  );
}
export function verifySignature(envelope, publicKey) {
  try {
    return (
      typeof envelope?.payload === "string" &&
      typeof envelope?.signature === "string" &&
      verify(
        null,
        Buffer.from(envelope.payload, "utf8"),
        publicKey,
        Buffer.from(envelope.signature, "base64"),
      )
    );
  } catch {
    return false;
  }
}

/** Trusted, single-owner desktop demo core. Signatures are real; these are NOT ZK proofs. */
export function createCore({
  now = Date.now,
  makeRoot = () => randomBytes(32),
  personaDeriver = derivePersona,
} = {}) {
  const keys = generateKeyPairSync("ed25519");
  let root;
  let active = false;
  let generation = randomUUID();
  let personas = new Map();
  const requests = new Map();
  const publicViews = new Map();
  let latestLink = null;
  const stamp = (payload) => ({
    payload: JSON.stringify({ scheme: SCHEME, ...payload }),
    signature: "",
  });
  function seal(payload) {
    const envelope = stamp(payload);
    envelope.signature = sign(
      null,
      Buffer.from(envelope.payload),
      keys.privateKey,
    ).toString("base64");
    return envelope;
  }
  function requireRoot() {
    check(root && active, "Verified mock root is missing or revoked");
  }
  function persona(context) {
    requireRoot();
    const entry = personas.get(context);
    check(entry, "Unknown persona context");
    check(!entry.revoked, `${entry.name} persona is revoked`);
    check(now() < entry.mandateExpiresAt, "Mandate expired");
    return entry;
  }
  function snapshot() {
    return {
      mode: "local-signed",
      root: root
        ? {
            status: active ? "MOCK VERIFIED" : "REVOKED",
            issuer: "VEIL demo issuer — no KYC",
          }
        : null,
      personas: [...personas.values()].map(clone),
      latestLink: clone(latestLink),
      serverTime: now(),
    };
  }
  function validate(envelope, expectedContext, expectedNonce) {
    check(
      verifySignature(envelope, keys.publicKey),
      "Invalid attestation signature",
    );
    const payload = JSON.parse(envelope.payload);
    check(
      payload.scheme === SCHEME && payload.kind === "authorization",
      "Wrong attestation type",
    );
    check(
      payload.context === expectedContext && payload.nonce === expectedNonce,
      "Context or challenge mismatch",
    );
    const p = persona(expectedContext);
    const request = requests.get(payload.nonce);
    check(
      request && request.generation === generation,
      "Unknown or reset challenge",
    );
    check(!request.used, "Replay blocked: challenge already consumed");
    check(
      now() < payload.expiresAt && now() < request.expiresAt,
      "Authorization expired",
    );
    check(
      payload.persona === p.id &&
        payload.action === p.action &&
        payload.target === p.target,
      "Scope mismatch",
    );
    check(
      payload.amount === request.amount && payload.amount <= p.limit,
      "Amount exceeds mandate",
    );
    check(payload.subject === request.subject, "Agent session mismatch");
    return { payload, request };
  }
  return {
    publicKey: () => keys.publicKey.export({ format: "jwk" }),
    snapshot,
    setup() {
      check(!root, "Root already exists; reset the demo to create another");
      root = makeRoot();
      active = true;
      personas = new Map(
        Object.entries(CONTEXTS).map(([context, definition]) => [
          context,
          {
            ...definition,
            context,
            id: personaDeriver(root, context),
            revoked: false,
            mandateExpiresAt: now() + 3_600_000,
          },
        ]),
      );
      return snapshot();
    },
    reset() {
      if (root) root.fill(0);
      root = undefined;
      active = false;
      generation = randomUUID();
      personas.clear();
      requests.clear();
      publicViews.clear();
      latestLink = null;
      return snapshot();
    },
    revoke(context) {
      if (context === "root") {
        requireRoot();
        active = false;
      } else {
        const entry = persona(context);
        entry.revoked = true;
      }
      return snapshot();
    },
    authorize(context, amount) {
      const p = persona(context);
      check(
        Number.isSafeInteger(amount) && amount > 0 && amount <= p.limit,
        "Amount must be a positive integer within this persona mandate",
      );
      for (const [nonce, request] of requests)
        if (now() >= request.expiresAt) requests.delete(nonce);
      check(requests.size < 500, "Too many pending requests");
      const nonce = randomUUID();
      const request = {
        amount,
        subject: randomUUID(),
        expiresAt: Math.min(now() + TTL, p.mandateExpiresAt),
        generation,
        used: false,
      };
      requests.set(nonce, request);
      const envelope = seal({
        kind: "authorization",
        context,
        persona: p.id,
        target: p.target,
        action: p.action,
        amount,
        subject: request.subject,
        nonce,
        authorized: true,
        issuedAt: now(),
        expiresAt: request.expiresAt,
      });
      publicViews.set(context, { envelope, execution: null });
      return clone(envelope);
    },
    execute(envelope, context, nonce) {
      const { payload, request } = validate(envelope, context, nonce);
      request.used = true;
      const execution = seal({
        kind: "execution",
        context,
        persona: payload.persona,
        nonce,
        action: payload.action,
        amount: payload.amount,
        result: "SIMULATED",
        description: {
          daily: "Fictional cafe purchase reserved",
          api: "Demo API response unlocked",
          defi: "Sandbox swap simulated — no funds moved",
        }[context],
        issuedAt: now(),
      });
      const view = publicViews.get(context);
      if (view?.envelope.payload === envelope.payload)
        view.execution = execution;
      return clone(execution);
    },
    link(contexts, consent) {
      check(consent === true, "Explicit consent is required");
      check(
        Array.isArray(contexts) &&
          contexts.length === 2 &&
          contexts[0] !== contexts[1],
        "Select exactly two distinct personas",
      );
      const selected = contexts.map(persona);
      latestLink = seal({
        kind: "selective-link",
        audience: "owner-selected-link-verifier",
        personas: selected.map((p) => ({ context: p.context, id: p.id })),
        samePrincipal: true,
        disclosure:
          "Only the selected pair; no root identifier or other persona",
        nonce: randomUUID(),
        issuedAt: now(),
        expiresAt: now() + TTL,
      });
      return clone(latestLink);
    },
    verifyLink(envelope) {
      check(
        verifySignature(envelope, keys.publicKey),
        "Invalid attestation signature",
      );
      const payload = JSON.parse(envelope.payload);
      check(
        payload.scheme === SCHEME &&
          payload.kind === "selective-link" &&
          payload.samePrincipal === true,
        "Wrong attestation type",
      );
      check(now() < payload.expiresAt, "Link attestation expired");
      check(
        payload.personas.length === 2 &&
          payload.personas[0].context !== payload.personas[1].context,
        "Invalid pair",
      );
      for (const selected of payload.personas)
        check(
          persona(selected.context).id === selected.id,
          "Persona is no longer current",
        );
      return {
        valid: true,
        samePrincipal: true,
        personas: payload.personas,
        mode: "local-signed",
      };
    },
    verifierView(context) {
      check(Object.hasOwn(CONTEXTS, context), "Unknown context");
      const view = publicViews.get(context);
      if (!view)
        return {
          context,
          envelope: null,
          execution: null,
          current: "NO RECEIPT",
        };
      const p = personas.get(context);
      const payload = JSON.parse(view.envelope.payload);
      const current =
        !active || p?.revoked
          ? "REVOKED"
          : now() >= payload.expiresAt
            ? "EXPIRED"
            : view.execution
              ? "CONSUMED"
              : "AUTHORIZED";
      return { context, ...clone(view), current };
    },
  };
}
