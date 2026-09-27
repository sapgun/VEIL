export type Context = "daily" | "api" | "defi";
export type ZkProof = {
  verified: boolean;
  circuit: string;
  transactionHash: string;
  transaction: string;
  transactionBytes: number;
  elapsedMs: number;
  network: string;
};
export type Envelope = { payload: string; signature: string; zk?: ZkProof };
export type Persona = {
  context: Context;
  name: string;
  label: string;
  action: string;
  target: string;
  limit: number;
  amount: number;
  glyph: string;
  id: string;
  revoked: boolean;
  mandateExpiresAt: number;
};
export type State = {
  root: null | { status: string; issuer: string };
  personas: Persona[];
  latestLink: Envelope | null;
  serverTime: number;
  latestProof?: ZkProof | null;
};
export type PublicView = {
  context: Context;
  envelope: Envelope | null;
  execution: Envelope | null;
  current: string;
};
let session = "";
export async function connect() {
  const response = await fetch("/api/session", { cache: "no-store" });
  if (!response.ok)
    throw new Error("Desktop Core unavailable. Start with npm run demo.");
  session = (await response.json()).token;
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(path.startsWith("owner/") ? { "X-Veil-Session": session } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}
/** Checks the exact payload bytes against the Core's key, never a key supplied by the receipt. */
export async function verifyEnvelope(envelope: Envelope): Promise<boolean> {
  const key = await api<JsonWebKey>("public/key");
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    key,
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  const signature = Uint8Array.from(atob(envelope.signature), (char) =>
    char.charCodeAt(0),
  );
  const signed = await crypto.subtle.verify(
    "Ed25519",
    publicKey,
    signature,
    new TextEncoder().encode(envelope.payload),
  );
  if (!signed) return false;
  if (JSON.parse(envelope.payload).kind === "execution") return true;
  if (!envelope.zk) return false;
  return (await api<{ valid: boolean }>("public/verify-proof", { envelope }))
    .valid;
}
