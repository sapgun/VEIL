import { randomBytes } from "node:crypto";
import { createCore } from "./core.mjs";
import { createMidnight, zkPersona, pad, digest } from "./midnight.mjs";

export function createZkCore() {
  let engine;
  let local = createCore();
  let proofs = new Map();
  let latestProof = null;
  let chain = Promise.resolve();
  const serial = (fn) => {
    const p = chain.then(fn);
    chain = p.catch(() => {});
    return p;
  };
  const decorate = (envelope) =>
    envelope ? { ...envelope, zk: proofs.get(envelope.payload) } : null;
  const snapshot = () => ({
    ...local.snapshot(),
    mode: "midnight-zk",
    latestProof,
    latestLink: proofs.has(local.snapshot().latestLink?.payload)
      ? decorate(local.snapshot().latestLink)
      : null,
  });
  function verify(envelope) {
    const proof = proofs.get(envelope?.payload);
    if (
      !proof ||
      proof.transactionHash !== envelope.zk?.transactionHash ||
      proof.transaction !== envelope.zk?.transaction
    )
      throw new Error("A verified Midnight proof is required");
    engine.verify(envelope.zk);
    return {
      valid: true,
      proofSystem: "Midnight ZK",
      network: "offline-ledger",
    };
  }
  return {
    snapshot,
    publicKey: () => local.publicKey(),
    setup: () =>
      serial(async () => {
        if (local.snapshot().root)
          throw new Error("Reset the existing identity first");
        const root = randomBytes(32);
        const next = await createMidnight(root);
        engine = next;
        local = createCore({ makeRoot: () => root, personaDeriver: zkPersona });
        local.setup();
        latestProof = next.enrollment;
        return snapshot();
      }),
    reset: () =>
      serial(async () => {
        local.reset();
        engine?.destroy();
        engine = undefined;
        proofs.clear();
        latestProof = null;
        return snapshot();
      }),
    authorize: (context, amount) =>
      serial(async () => {
        if (proofs.size >= 200)
          throw new Error("Reset the demo before creating more proofs");
        const envelope = local.authorize(context, amount);
        const p = JSON.parse(envelope.payload);
        const proof = await engine.call("authorize", [
          pad(context),
          digest(envelope.payload),
          digest(p.nonce),
        ]);
        proofs.set(envelope.payload, proof);
        latestProof = proof;
        return decorate(envelope);
      }),
    link: (contexts, consent) =>
      serial(async () => {
        if (proofs.size >= 200)
          throw new Error("Reset the demo before creating more proofs");
        const envelope = local.link(contexts, consent);
        const proof = await engine.call("linkSelected", [
          pad(contexts[0]),
          pad(contexts[1]),
          digest(envelope.payload),
        ]);
        proofs.set(envelope.payload, proof);
        latestProof = proof;
        return decorate(envelope);
      }),
    revoke: (context) =>
      serial(async () => {
        const state = local.snapshot();
        if (!state.root || state.root.status === "REVOKED")
          throw new Error("No active root");
        const targets =
          context === "root"
            ? state.personas.filter((p) => !p.revoked).map((p) => p.context)
            : [context];
        for (const target of targets) {
          if (!state.personas.some((p) => p.context === target && !p.revoked))
            throw new Error("No active persona");
          latestProof = await engine.call("revoke", [pad(target)]);
          local.revoke(target);
        }
        if (context === "root") local.revoke("root");
        return snapshot();
      }),
    execute: (envelope, context, nonce) =>
      serial(async () => {
        verify(envelope);
        return local.execute(envelope, context, nonce);
      }),
    verifyProof: verify,
    verifyLink: (envelope) => {
      verify(envelope);
      return { ...local.verifyLink(envelope), mode: "midnight-zk" };
    },
    verifierView: (context) => {
      const view = local.verifierView(context);
      return proofs.has(view.envelope?.payload)
        ? { ...view, envelope: decorate(view.envelope) }
        : { context, envelope: null, execution: null, current: "NO RECEIPT" };
    },
  };
}
