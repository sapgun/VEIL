import { describe, it, expect } from "vitest";
import { createPublicKey, randomBytes } from "node:crypto";
import { createCore, derivePersona, verifySignature, TTL } from "./core.mjs";

const payload = (envelope) => JSON.parse(envelope.payload);
const prepared = () => {
  const core = createCore();
  core.setup();
  return core;
};
describe("private Core and context authority", () => {
  it("requires a mock verified root", () =>
    expect(() => createCore().authorize("daily", 12)).toThrow(/root/));
  it("derives deterministic, domain-separated personas from secret entropy", () => {
    const secret = randomBytes(32);
    expect(derivePersona(secret, "daily")).toBe(derivePersona(secret, "daily"));
    expect(
      new Set(
        ["daily", "api", "defi"].map((context) =>
          derivePersona(secret, context),
        ),
      ).size,
    ).toBe(3);
    expect(derivePersona(randomBytes(32), "daily")).not.toBe(
      derivePersona(secret, "daily"),
    );
  });
  it.each([
    ["daily", 12],
    ["api", 2],
    ["defi", 25],
  ])("signs and consumes %s authority", (context, amount) => {
    const core = prepared();
    const envelope = core.authorize(context, amount);
    const key = createPublicKey({ key: core.publicKey(), format: "jwk" });
    expect(verifySignature(envelope, key)).toBe(true);
    const result = core.execute(envelope, context, payload(envelope).nonce);
    expect(payload(result).result).toBe("SIMULATED");
    expect(verifySignature(result, key)).toBe(true);
  });
  it("rejects tampering and an untrusted signer", () => {
    const core = prepared();
    const envelope = core.authorize("daily", 12);
    const changed = {
      ...envelope,
      payload: envelope.payload.replace('"amount":12', '"amount":1'),
    };
    expect(() =>
      core.execute(changed, "daily", payload(envelope).nonce),
    ).toThrow(/signature/);
    const other = prepared().authorize("daily", 12);
    expect(() => core.execute(other, "daily", payload(other).nonce)).toThrow(
      /signature/,
    );
  });
  it("binds the target context and challenge", () => {
    const core = prepared();
    const envelope = core.authorize("daily", 12);
    expect(() =>
      core.execute(envelope, "api", payload(envelope).nonce),
    ).toThrow(/mismatch/);
    expect(() => core.execute(envelope, "daily", "other-nonce")).toThrow(
      /mismatch/,
    );
  });
  it.each([0, -1, 1.5, 51, NaN, "12"])(
    "rejects invalid/out-of-scope amount %s",
    (amount) =>
      expect(() => prepared().authorize("daily", amount)).toThrow(/Amount/),
  );
  it("prevents replay independently of frontend state", () => {
    const core = prepared();
    const envelope = core.authorize("daily", 12);
    const nonce = payload(envelope).nonce;
    core.execute(envelope, "daily", nonce);
    expect(() => core.execute(envelope, "daily", nonce)).toThrow(/Replay/);
  });
  it("expires at the exact deadline", () => {
    let time = 100;
    const core = createCore({ now: () => time });
    core.setup();
    const envelope = core.authorize("daily", 12);
    time += TTL;
    expect(() =>
      core.execute(envelope, "daily", payload(envelope).nonce),
    ).toThrow(/expired/);
  });
  it("revokes issued authority immediately while preserving another persona", () => {
    const core = prepared();
    const envelope = core.authorize("daily", 12);
    core.revoke("daily");
    expect(() => core.authorize("daily", 12)).toThrow(/revoked/);
    expect(() =>
      core.execute(envelope, "daily", payload(envelope).nonce),
    ).toThrow(/revoked/);
    expect(payload(core.authorize("api", 2)).authorized).toBe(true);
    expect(core.verifierView("daily").current).toBe("REVOKED");
  });
  it("root revocation invalidates all personas", () => {
    const core = prepared();
    core.revoke("root");
    for (const context of ["daily", "api", "defi"])
      expect(() => core.authorize(context, 1)).toThrow(/root/);
  });
  it("reset invalidates outstanding receipts and changes persona identifiers", () => {
    const core = prepared();
    const old = core.snapshot().personas[0].id;
    const envelope = core.authorize("daily", 12);
    core.reset();
    core.setup();
    expect(core.snapshot().personas[0].id).not.toBe(old);
    expect(() =>
      core.execute(envelope, "daily", payload(envelope).nonce),
    ).toThrow(/challenge/);
  });
  it("returns only the selected context receipt to a verifier", () => {
    const core = prepared();
    core.authorize("daily", 12);
    core.authorize("api", 2);
    const publicData = JSON.stringify(core.verifierView("daily"));
    expect(publicData).not.toContain(core.snapshot().personas[1].id);
    expect(publicData).not.toContain(core.snapshot().personas[2].id);
    expect(
      Object.keys(payload(core.verifierView("daily").envelope)).sort(),
    ).toEqual(
      [
        "scheme",
        "kind",
        "context",
        "persona",
        "target",
        "action",
        "amount",
        "subject",
        "nonce",
        "authorized",
        "issuedAt",
        "expiresAt",
      ].sort(),
    );
    expect(JSON.stringify(core.snapshot())).not.toMatch(
      /rootSecret|privateKey|seed/,
    );
  });
});
describe("owner-consented same-principal attestation", () => {
  it("requires consent and two distinct current personas", () => {
    const core = prepared();
    expect(() => core.link(["daily", "defi"], false)).toThrow(/consent/);
    expect(() => core.link(["daily", "daily"], true)).toThrow(/distinct/);
    expect(() => core.link(["daily", "defi", "api"], true)).toThrow(/two/);
    expect(() => core.link(["daily", "unknown"], true)).toThrow(/Unknown/);
  });
  it("attests only the chosen pair and omits unrelated persona and root", () => {
    const core = prepared();
    const envelope = core.link(["daily", "defi"], true);
    expect(core.verifyLink(envelope).valid).toBe(true);
    expect(payload(envelope).personas.map((p) => p.context)).toEqual([
      "daily",
      "defi",
    ]);
    expect(envelope.payload).not.toContain(core.snapshot().personas[1].id);
    expect(Object.keys(payload(envelope)).sort()).toEqual(
      [
        "scheme",
        "kind",
        "audience",
        "personas",
        "samePrincipal",
        "disclosure",
        "nonce",
        "issuedAt",
        "expiresAt",
      ].sort(),
    );
  });
  it("rejects linkage after revocation, tampering or reset", () => {
    const core = prepared();
    const envelope = core.link(["daily", "defi"], true);
    expect(() =>
      core.verifyLink({ ...envelope, payload: envelope.payload + " " }),
    ).toThrow(/signature/);
    core.revoke("daily");
    expect(() => core.verifyLink(envelope)).toThrow(/revoked/);
    expect(() => core.link(["daily", "defi"], true)).toThrow(/revoked/);
    core.reset();
    core.setup();
    expect(() => core.verifyLink(envelope)).toThrow(/current/);
  });
  it("expires a link attestation", () => {
    let time = 0;
    const core = createCore({ now: () => time });
    core.setup();
    const envelope = core.link(["daily", "defi"], true);
    time = TTL;
    expect(() => core.verifyLink(envelope)).toThrow(/expired/);
  });
});
