import { createHash, createPublicKey, sign, verify } from "node:crypto";

export const PROTOCOL = "VEIL-AGENT-v1";
export function check(condition, message) { if (!condition) throw new Error(message); }
export function exact(value, keys) {
  check(value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...keys].sort().join(","), "Invalid envelope fields");
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  check(value === null || typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isSafeInteger(value)), "Unsupported signed value");
  return JSON.stringify(value);
}
export const digest = (value) => createHash("sha256").update(canonical(value)).digest("hex");
export function publicAgentKey(jwk) {
  exact(jwk, ["kty", "crv", "x"]);
  check(jwk.kty === "OKP" && jwk.crv === "Ed25519" && typeof jwk.x === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(jwk.x) && Buffer.from(jwk.x, "base64url").toString("base64url") === jwk.x,
  "Expected public Ed25519 JWK");
  return createPublicKey({ key: jwk, format: "jwk" });
}
export function signAgentRequest(privateKey, message) {
  return { message, signature: sign(null, Buffer.from(canonical(message)), privateKey).toString("base64url") };
}
export function verifyAgentRequest(envelope, jwk, audience, action, now) {
  exact(envelope, ["message", "signature"]);
  const m = envelope.message;
  exact(m, ["protocol", "audience", "action", "agentId", "requestId", "issuedAt", "expiresAt", "payload"]);
  check(m.protocol === PROTOCOL && m.audience === audience && m.action === action, "Wrong protocol, audience or action");
  check(typeof m.agentId === "string" && /^[0-9a-f-]{36}$/.test(m.agentId) &&
    typeof m.requestId === "string" && /^[0-9a-f-]{36}$/.test(m.requestId), "Invalid request identity");
  check(Number.isSafeInteger(m.issuedAt) && Number.isSafeInteger(m.expiresAt) &&
    m.issuedAt <= now && now < m.expiresAt && m.expiresAt > m.issuedAt &&
    m.expiresAt - m.issuedAt <= 60000, "Signed request expired or invalid time window");
  check(typeof envelope.signature === "string" && /^[A-Za-z0-9_-]{86}$/.test(envelope.signature) &&
    Buffer.from(envelope.signature, "base64url").toString("base64url") === envelope.signature,
  "Invalid agent signature encoding");
  check(verify(null, Buffer.from(canonical(m)), publicAgentKey(jwk), Buffer.from(envelope.signature, "base64url")), "Invalid agent signature");
  return m;
}
