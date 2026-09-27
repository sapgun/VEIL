# VEIL

**Unlink by Default. Link by Consent.**

A web-based Midnight Korea Hackathon MVP: one hidden root, three economic personas (**DAILY / API / DEFI**), private authorization, consented same-root proofs and revocation.

**Real Midnight ZK is implemented.** Compact circuits compile, the official Midnight proof server generates proofs, and the Midnight ledger verifies those proofs before the UI reports success. This runs against an **in-memory offline ledger**, not a public network. Credential issuance is mocked; purchases, API billing and swaps are simulated.

## Run the real ZK demo

Requirements: Node 22.14+, Midnight Compact compiler **0.30.0**, and Docker with Linux containers (or the official proof-server 8.0.3 binary). Compiler installation: [official Compact guide](https://docs.midnight.network/compact/compilation-and-tooling/dev-tool-usage).

```sh
npm ci
compact update 0.30.0
npm run contract:build
docker compose up -d proof-server
npm run demo
```

Compile in Linux/macOS or a development WSL distribution. Native Windows has an unrelated `compact.exe`; the compile wrapper deliberately rejects it. Initial compilation/proof-server startup downloads public ZK parameters. Wait for the proof server to listen on port 6300.

Open **http://127.0.0.1:43127/** and choose **APP**, or open **http://127.0.0.1:43127/app** directly. No wallet, API key, seed or account is required. Keep the proof server local: it receives private witness data. The app rejects remote prover URLs.

```sh
npm test              # 29 Core / HTTP / landing tests
npm run test:zk       # real proofs + circuit and verifier rejection tests
npm run build         # TypeScript + production frontend
npm start             # serve the built app and ZK Core
```

`dist/` alone is not a complete application. `npm run preview` only serves static assets. Private and public demo state are ephemeral; reset/restart invalidates the current identity and receipts. Missing compiler output or an unavailable prover causes failure, never a signature-only fallback.

## Three-minute walkthrough

1. **Create mock verified root.** The issuer-gated `enroll` circuit proves registration. A random root stays in Core memory; three Compact-hash-derived persona IDs appear.
2. **DAILY:** click **Generate Midnight ZK proof**, then execute the simulated purchase. The receipt shows `authorize`, transaction size, proof timing and transaction digest. A digest alone is not treated as proof: actual transaction bytes are verified.
3. Repeat with **API** and **DEFI**. Open each counterparty view to see only that context's receipt.
4. Select **DAILY + DEFI**, explicitly consent, and generate a **selective link ZK proof**. `linkSelected` proves both derive from the same hidden enrolled root. API is omitted.
5. **Revoke DAILY.** The `revoke` circuit is proved and applied. A later authorization or link involving DAILY is rejected. Root revocation proves revocation for all three known personas.
6. Test replay rejection, an amount above the demo mandate, or expiry after 60 seconds.

## What the proof establishes

- Knowledge of a hidden root whose commitment belongs to the public Merkle tree.
- Domain-separated persona derivation using Compact `persistentHash`.
- Authorization binds that persona, the exact receipt digest and nonce; circuit checks revocation and request replay.
- Selective linking derives both selected personas from the **same** hidden root and checks both are active.
- Revocation requires knowledge of the corresponding hidden enrolled root.

Amount, target, action, consent and receipt expiry are **Core-enforced policy**. They are bound by the receipt digest but are not independently constrained by the circuit. The mock issuer does not prove real-world credential authenticity. The root secret and private witness transcript never enter API responses or source control.

## Verification boundary

`server/midnight.mjs` uses compiler-generated circuits, Midnight proof-server **8.0.3**, Compact runtime **0.15.0**, SDK **4.0.4** and ledger-v8 **8.0.3**. It calls the real prover, binds each transaction, invokes `wellFormed` with **contract/native proof and signature verification enabled**, and applies the verified transaction to the local ledger. The verification endpoint deserializes the submitted transaction bytes and verifies them again against retained historical public state.

Only fee balancing is disabled because this offline demo has no funded wallet. No `mockProve`, fabricated proof or network-finality claim is used. The browser checks the supplemental Ed25519 receipt signature and asks the local Core to verify the Midnight proof; it does not run the ledger WASM verifier itself.

## Privacy and remaining work

The trusted Desktop Core knows all persona relationships. The demo has one enrolled root, so its anonymity set is one; it demonstrates the circuit mechanism, **not production anonymity**. Timing and other metadata can still correlate actions. A selected-link disclosure cannot be undone after someone observes it.

The owner API and verifier screens share one local origin. Do not expose them publicly. Encrypted phone pairing, independent external verifiers, authenticated agent keys, private mandate circuits, durable revocation, a funded wallet and public-network deployment remain future work. Native mobile apps and real settlement are out of scope.

## Source map

- `contracts/veil.compact`: four real provable circuits.
- `server/midnight.mjs`: proof generation, actual ledger verification and state transitions.
- `server/zk-core.mjs`: serialized ZK-backed authorization / link / revocation flow.
- `server/core.mjs`: receipt signing and execution policy; also tested independently.
- `server/http.mjs`: loopback API and frontend server.
- `src/`: React/TypeScript owner and verifier UI; PWA assets in `public/`.
- `scripts/zk-smoke.mjs`: positive proofs and negative circuit/verifier tests.

See [security boundaries](docs/SECURITY.md), [validation](docs/VALIDATION.md), and [contract details](contracts/README.md). Hosting, recording and submitting the hackathon form are not performed by this repository.

