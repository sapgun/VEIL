import { generateKeyPairSync } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// A separate test-only identity. Refuse overwrites and never print secret bytes.
const directory = new URL("../.private/", import.meta.url);
await mkdir(directory, { recursive: true, mode: 0o700 });
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const secret = privateKey.export({ format: "jwk" });
const publicPart = publicKey.export({ format: "jwk" });
const bytes = [...Buffer.from(secret.d, "base64url"), ...Buffer.from(publicPart.x, "base64url")];
const destination = new URL("solana-devnet-keypair.json", directory);
await writeFile(destination, JSON.stringify(bytes), { mode: 0o600, flag: "wx" });
console.log(`Created dedicated Devnet keypair: ${fileURLToPath(destination)}`);
