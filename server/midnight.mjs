import { randomBytes, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Contract } from "../contracts/managed/veil/contract/index.js";
import * as CC from "@midnight-ntwrk/compact-js/effect/CompiledContract";
import {
  createCircuitContext,
  ContractState as RuntimeState,
  CompactTypeBytes,
  CompactTypeVector,
  persistentHash,
} from "@midnight-ntwrk/compact-runtime";
import { createUnprovenDeployTxFromVerifierKeys } from "@midnight-ntwrk/midnight-js-contracts";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import {
  LedgerState,
  WellFormedStrictness,
  TransactionContext,
  StateValue,
  ChargedState,
  QueryContext,
  PreTranscript,
  partitionTranscripts,
  ContractCallPrototype,
  Intent,
  Transaction,
  communicationCommitmentRandomness,
} from "@midnight-ntwrk/ledger-v8";

setNetworkId("undeployed");
export const pad = (s) => {
  const b = new Uint8Array(32);
  b.set(new TextEncoder().encode(s));
  return b;
};
export const hash = (...v) =>
  persistentHash(new CompactTypeVector(v.length, new CompactTypeBytes(32)), v);
export const digest = (s) => createHash("sha256").update(s).digest();
export const zkPersona = (root, context) =>
  "vp_" +
  Buffer.from(hash(pad("VEIL/persona/v1"), root, pad(context))).toString("hex");

// SDK 2.5's encode/decode bridge drops the Merkle tree hash cache. Explicitly
// rehash the public tree before transcript partitioning; never alter its leaves.
function rehash(v) {
  if (v.type() === "boundedMerkleTree")
    return StateValue.newBoundedMerkleTree(v.asBoundedMerkleTree().rehash());
  if (v.type() === "array")
    return v
      .asArray()
      .reduce((a, b) => a.arrayPush(rehash(b)), StateValue.newArray());
  return v;
}
function strictness() {
  const s = new WellFormedStrictness();
  // Offline proof demo has no funded wallet. Only fee balancing is disabled.
  s.enforceBalancing = false;
  s.verifyNativeProofs = true;
  s.verifyContractProofs = true;
  s.verifySignatures = true;
  s.enforceLimits = true;
  return s;
}
export async function createMidnight(root) {
  const ps = { root, issuer: randomBytes(32) };
  const commitment = hash(pad("VEIL/root/v1"), root);
  const witnesses = {
    rootSecret: ({ privateState }) => [privateState, privateState.root],
    issuerSecret: ({ privateState }) => [privateState, privateState.issuer],
    membershipPath: ({ privateState, ledger }) => {
      const path = ledger.roots.findPathForLeaf(commitment);
      if (!path) throw new Error("Root not enrolled");
      return [privateState, path];
    },
  };
  const assets = fileURLToPath(
    new URL("../contracts/managed/veil/", import.meta.url),
  );
  const compiled = CC.make("VEIL", Contract).pipe(
    CC.withWitnesses(witnesses),
    CC.withCompiledFileAssets(assets),
  );
  const config = new NodeZkConfigProvider(assets);
  const proofUrl = process.env.VEIL_PROOF_SERVER ?? "http://127.0.0.1:6300";
  if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(proofUrl).hostname))
    throw new Error(
      "A local proof server is required: witnesses must stay on this machine",
    );
  const prover = httpClientProofProvider(proofUrl, config);
  let state = LedgerState.blank("undeployed");
  const coin = "00".repeat(32);
  const evidence = new Map();
  async function apply(tx, circuit) {
    const start = Date.now();
    const ref = state;
    const bound = (await prover.proveTx(tx)).bind();
    const now = new Date();
    const verified = bound.wellFormed(ref, strictness(), now);
    const seconds = BigInt(Math.floor(now.getTime() / 1000));
    const ctx = new TransactionContext(ref, {
      secondsSinceEpoch: seconds,
      secondsSinceEpochErr: 1,
      parentBlockHash: "00".repeat(32),
      lastBlockTime: seconds - 1n,
    });
    const [next, result] = ref.apply(verified, ctx);
    if (result.type !== "success")
      throw new Error("Midnight ledger rejected the transaction");
    state = next.postBlockUpdate(now);
    const bytes = bound.serialize();
    const transactionHash = digest(bytes).toString("hex");
    // Retain only public state and proven transactions, never witness transcripts.
    evidence.set(transactionHash, { bound, ref, time: now });
    return {
      verified: true,
      circuit,
      transactionHash,
      transaction: Buffer.from(bytes).toString("base64"),
      transactionBytes: bytes.length,
      elapsedMs: Date.now() - start,
      network: "offline-ledger",
      proofSystem: "Midnight ZK",
      contractProofsVerified: true,
    };
  }
  const deploy = await createUnprovenDeployTxFromVerifierKeys(
    config,
    coin,
    {
      compiledContract: compiled,
      initialPrivateState: ps,
      args: [hash(pad("VEIL/issuer/v1"), ps.issuer)],
    },
    coin,
  );
  await apply(deploy.private.unprovenTx, "deploy");
  const address = deploy.public.contractAddress;
  const contract = new Contract(witnesses);
  async function call(circuit, args) {
    const initial = state.index(address);
    const context = createCircuitContext(
      address,
      coin,
      RuntimeState.deserialize(initial.serialize()),
      ps,
    );
    const { proofData: pd } = contract.circuits[circuit](context, ...args);
    const qc = new QueryContext(
      new ChargedState(rehash(StateValue.decode(initial.data.state.encode()))),
      address,
    );
    const [parts] = partitionTranscripts(
      [new PreTranscript(qc, pd.publicTranscript)],
      state.parameters,
    );
    const prototype = new ContractCallPrototype(
      address,
      circuit,
      initial.operation(circuit),
      parts[0],
      parts[1],
      pd.privateTranscriptOutputs,
      pd.input,
      pd.output,
      communicationCommitmentRandomness(),
      circuit,
    );
    const tx = Transaction.fromParts(
      "undeployed",
      undefined,
      undefined,
      Intent.new(new Date(Date.now() + 3600000)).addCall(prototype),
    );
    return apply(tx, circuit);
  }
  const enrollment = await call("enroll", [commitment]);
  return {
    enrollment,
    call,
    verify(proof) {
      const record = evidence.get(proof?.transactionHash);
      if (!record) throw new Error("Unknown ZK transaction");
      const bytes = Buffer.from(proof.transaction, "base64");
      const submitted = Transaction.deserialize(
        "signature",
        "proof",
        "binding",
        bytes,
      );
      // Re-run the actual verifier against the historical public ledger state.
      submitted.wellFormed(record.ref, strictness(), record.time);
      if (digest(bytes).toString("hex") !== proof.transactionHash)
        throw new Error("Altered ZK transaction");
      return true;
    },
    destroy() {
      ps.root.fill(0);
      ps.issuer.fill(0);
      evidence.clear();
    },
  };
}
