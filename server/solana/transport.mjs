import { readFile } from "node:fs/promises";
import {
  address, appendTransactionMessageInstruction, createKeyPairSignerFromBytes,
  createSolanaRpc, createTransactionMessage, getBase64EncodedWireTransaction,
  getSignatureFromTransaction, pipe, setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

// Full genesis hash, not the truncated CAIP-2 chain reference.
export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const RPC_TIMEOUT_MS = 15_000;

export function solanaConfig(env = process.env) {
  const key = env.HELIUS_API_KEY?.trim();
  return {
    enabled: env.VEIL_SOLANA_ENABLED === "1",
    keypairPath: env.VEIL_SOLANA_KEYPAIR_PATH,
    provider: key ? "helius" : "solana-public",
    rpcUrl: key
      ? `https://devnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`
      : "https://api.devnet.solana.com",
  };
}

export async function loadDevnetSigner(path) {
  if (!path) throw new Error("Set VEIL_SOLANA_KEYPAIR_PATH to a dedicated Devnet keypair");
  let data;
  try { data = JSON.parse(await readFile(path, "utf8")); }
  catch { throw new Error("Cannot read Devnet keypair file"); }
  if (!Array.isArray(data) || data.length !== 64 ||
      !data.every((n) => Number.isInteger(n) && n >= 0 && n <= 255))
    throw new Error("Devnet keypair must be a 64-byte Solana CLI JSON array");
  try { return await createKeyPairSignerFromBytes(Uint8Array.from(data)); }
  catch { throw new Error("Invalid Devnet keypair"); }
}

// All errors from the RPC boundary are deliberately sanitized: provider errors
// may contain credential-bearing URLs. Never return wire bytes or signer data.
export function createSolanaTransport({ signer, rpcUrl, provider = "solana-public", rpc = createSolanaRpc(rpcUrl) }) {
  const call = async (request) => {
    try { return await request.send({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT_MS) }); }
    catch { throw new Error("Solana RPC request failed"); }
  };
  return {
    payer: signer.address,
    provider,
    async assertDevnet() {
      if (await call(rpc.getGenesisHash()) !== DEVNET_GENESIS)
        throw new Error("Only Solana Devnet is supported");
    },
    async prepare({ recipient, lamports }) {
      const { value: lifetime } = await call(rpc.getLatestBlockhash({ commitment: "confirmed" }));
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
        (m) => appendTransactionMessageInstruction(getTransferSolInstruction({
          source: signer, destination: address(recipient), amount: BigInt(lamports),
        }), m),
      );
      const transaction = await signTransactionMessageWithSigners(message);
      return {
        wire: getBase64EncodedWireTransaction(transaction),
        signature: getSignatureFromTransaction(transaction),
        lastValidBlockHeight: lifetime.lastValidBlockHeight,
      };
    },
    async simulate(prepared) {
      const { value } = await call(rpc.simulateTransaction(prepared.wire, {
        encoding: "base64", commitment: "confirmed", sigVerify: true,
      }));
      if (value.err !== null) throw new Error("Solana simulation rejected the payment");
    },
    async submit(prepared) {
      const signature = await call(rpc.sendTransaction(prepared.wire, {
        encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 0n,
      }));
      if (signature !== prepared.signature) throw new Error("RPC signature mismatch");
    },
    async status(signature) {
      const { value } = await call(rpc.getSignatureStatuses([signature], { searchTransactionHistory: true }));
      const status = value[0];
      if (!status) return "pending";
      if (status.err !== null) return "failed";
      return ["confirmed", "finalized"].includes(status.confirmationStatus)
        ? status.confirmationStatus : "pending";
    },
  };
}
