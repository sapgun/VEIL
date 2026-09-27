import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createZkCore } from "../server/zk-core.mjs";
import { createMidnight, pad, digest } from "../server/midnight.mjs";
const core = createZkCore();
const setup = await core.setup();
assert.equal(new Set(setup.personas.map((p) => p.id)).size, 3);
const evidence = [];
for (const context of ["daily", "api", "defi"]) {
  const receipt = await core.authorize(context, 2);
  assert.equal(core.verifyProof(receipt).valid, true);
  assert.equal(receipt.zk.contractProofsVerified, true);
  const { nonce } = JSON.parse(receipt.payload);
  await core.execute(receipt, context, nonce);
  await assert.rejects(core.execute(receipt, context, nonce), /Replay/);
  const { transaction, ...summary } = receipt.zk;
  evidence.push({ context, ...summary });
}
await assert.rejects(core.authorize("api", 11), /mandate/);
await assert.rejects(core.link(["daily", "defi"], false), /consent/);
const link = await core.link(["daily", "defi"], true);
assert.equal(core.verifyLink(link).valid, true);
assert.equal(JSON.parse(link.payload).personas.length, 2);
assert.ok(
  !link.payload.includes(setup.personas.find((p) => p.context === "api").id),
);
assert.throws(() => core.verifyProof({ ...link, payload: link.payload + " " }));
await core.revoke("daily");
await assert.rejects(core.authorize("daily", 1), /revoked/);
assert.throws(() => core.verifyLink(link), /revoked/);
await core.reset();
assert.throws(() => core.verifyProof(link));
// Exercise the actual circuit and ledger verifier independently of Core guards.
const engine = await createMidnight(randomBytes(32));
const args = [pad("daily"), randomBytes(32), randomBytes(32)];
const proof = await engine.call("authorize", args);
assert.equal(engine.verify(proof), true);
await assert.rejects(engine.call("authorize", args), /Request replay/);
const altered = Buffer.from(proof.transaction, "base64");
altered[Math.floor(altered.length / 2)] ^= 1;
assert.throws(() =>
  engine.verify({ ...proof, transaction: altered.toString("base64") }),
);
await assert.rejects(
  engine.call("linkSelected", [
    pad("daily"),
    pad("daily"),
    digest("challenge"),
  ]),
  /distinct/,
);
await engine.call("revoke", [pad("daily")]);
await assert.rejects(
  engine.call("authorize", [pad("daily"), randomBytes(32), randomBytes(32)]),
  /revoked/,
);
await assert.rejects(
  engine.call("linkSelected", [pad("daily"), pad("defi"), randomBytes(32)]),
  /revoked/,
);
engine.destroy();
console.log(
  JSON.stringify(
    {
      result: "PASS",
      mode: "real-midnight-zk-offline-ledger",
      checks: [
        "three-context-proofs",
        "selective-link-proof",
        "revocation-proof",
        "proof-tamper-rejected",
        "circuit-replay-rejected",
        "revoked-circuit-rejected",
        "consent",
        "amount",
        "execution-replay",
        "reset-invalidates",
      ],
      evidence,
    },
    null,
    2,
  ),
);
