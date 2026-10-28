<p align="center">
  <img src="docs/assets/veil-teaser-silhouette.png" width="320" alt="VEIL — Coming Soon">
</p>

<h1 align="center">VEIL</h1>

<p align="center"><strong>Unlink by Default. Link by Consent.</strong></p>

<p align="center">Privacy and authorization infrastructure for humans and AI agents.</p>

---

VEIL is building a private economic identity and authorization layer: one human can use context-specific personas, prove authority, selectively disclose relationships, and revoke future permissions. The current implementation combines a Midnight-based local ZK MVP with an initial Solana Devnet payment adapter. The adapter uses Solana Kit and can connect to Helius RPC; its local payment policy is not yet bound to a Midnight proof.

**One verified human. Many economic personas. Linked only when you choose.**

- **Hide the Principal. Prove the Authority.**
- **Accountability at the Root. Unlinkability at the Edge.**
- **Minimum identity. Maximum verifiability.**

**Live site (landing):** https://veil-sigma-lilac.vercel.app/ — the interactive ZK demo runs locally (see below); the static deployment serves the landing only.

## Current status

**Implemented today: Midnight local ZK authorization and an initial owner-authorized Solana Devnet SOL payment adapter.** The adapter has automated offline coverage using real signed transactions and injected RPC responses. Live Helius settlement, proof-bound payment authority and autonomous agent delegation are not yet verified.

See [Solana Devnet setup and API](docs/SOLANA-DEVNET.md) for the CLI, Helius configuration, tests and trust boundaries.

| Area | Current implementation | Next work |
| --- | --- | --- |
| Identity and personas | Mock credential issuer, hidden root, DAILY / API / DEFI personas | Real issuer integration and authenticated agent keys |
| ZK authorization | Midnight Compact circuits, real proof generation and verification on an in-memory offline ledger | Connect verified authority to payment execution |
| Policy | Original authorization uses Core-enforced policy; the additive `authorizeWithPolicy` circuit enforces a public per-request amount cap | Cumulative budget accounting and payment-specific policy binding |
| Consent and revocation | Selective persona linking and revocation in the local demo | Durable state and enforcement at the settlement boundary |
| Payments | Existing UI actions remain simulated; separate Devnet SOL adapter and explicit CLI payment path | Funded Devnet validation and payment UI |
| Helius | Server-side Devnet endpoint configuration; Kit RPC simulation, submission and status polling | Live Helius validation and account subscriptions |
| Confidential Solana payments | No integration implemented | Evaluate Solana Rings separately after the basic payment flow |

The [live landing](https://veil-sigma-lilac.vercel.app/) introduces the project; it does not host the local ZK Core or execute real payments.

## Architecture and responsibilities

The working Midnight core and the planned Solana adapter serve different responsibilities:

| Component | Responsibility | Status |
| --- | --- | --- |
| VEIL Core | Manage personas, consent, authorization receipts and execution policy | Implemented locally; production hardening remains |
| Midnight | Generate and verify proofs of persona authority, selected links and revocation; additional circuit checks a per-request amount cap | Implemented on the offline demo ledger |
| Solana adapter | Build, sign, simulate and submit a scoped Devnet SOL transfer; reject stale authority and duplicate execution | Initial local-policy adapter; offline tested |
| Helius | Provide Devnet RPC access and transaction status for the adapter | Configured through a server-side key; live validation pending |
| Solana Rings | Potential confidentiality for settlement | Research; independent of basic RPC integration |

A valid Midnight proof does **not** automatically authorize or constrain a Solana transaction. The adapter still needs a defined trust boundary, authenticated signing authority, and binding between the authorization and the exact network, recipient, asset, amount and request. The initial adapter checks current Core state and enforces owner-issued payment policy locally. It does not bind the payment intent into the existing Midnight proof transcript or implement a cross-chain proof verifier or trustless bridge.

## Solana Devnet payment MVP: implementation and next validation

The adapter and owner-only API implement the following flow under trusted local policy. The CLI can exercise it with a separate local signed Core; live settlement evidence is still pending:

1. A user grants a scoped payment authorization for an agent, including recipient, asset, per-request amount cap and expiry.
2. The execution component validates authority and policy, including current revocation, and binds the request to the exact transaction.
3. The adapter simulates and submits the authorized transaction through Helius RPC.
4. It tracks confirmation and exposes the result with the authorization receipt.
5. Negative cases reject over-cap, expired, revoked and replayed requests before signing or submission.

**Next validation evidence:** a reproducible funded Devnet transaction, its matching local intent record, and rejection cases for invalid requests. Automated tests cover the implementation with injected RPC responses; they do not demonstrate live settlement or a Midnight-attested payment. A per-request cap is not a cumulative spending budget. Local revocation is not on-chain enforcement, and cannot undo an already signed or settled transaction.

### Why Helius

The adapter selects Helius Devnet when a server-side `HELIUS_API_KEY` is set, and the public Solana Devnet RPC otherwise:

- **RPC reads and simulation:** obtain required account state and simulate the proposed payment.
- **Transaction submission and confirmation:** submit signed transactions, track status, and reconcile failures without treating an RPC acknowledgment as settlement.
- **Current confirmation strategy:** poll signature status; WebSocket account/signature subscriptions are planned, not implemented.

The initial scope does not depend on NFT indexing or high-volume trading infrastructure. Actual endpoint, Devnet and subscription availability must be checked when integrating.

### Confidential payments: a separate research track

[Helius Privacy / Solana Rings](https://www.helius.dev/docs/privacy) is a potential follow-on integration. At the time of this plan, the official documentation describes a Devnet beta: standard confidential transfers hide the asset and amount while keeping sender and recipient public. This does not establish unlinkability between VEIL personas.

RPC plan access should not be assumed to include Rings access or production availability. Integration feasibility, access requirements, signer/delegation compatibility and metadata exposure need separate validation. The first Devnet payment milestone can use public transfers; it must not be presented as a confidential-payment demo until that integration is implemented and verified.

## Understand the current Midnight MVP in 90 seconds

1. Three economic personas — **DAILY / API / DEFI** — belong to one verified principal.
2. Outside observers cannot normally link them to each other.
3. Each persona can independently prove valid economic authority with a real Midnight ZK proof.
4. The owner can selectively link two personas without revealing the root identity.
5. Revocation invalidates future authority.

The future economy may be agent-to-agent and machine-to-machine. Humans should not have to turn their entire economic lives into one globally linkable identity graph to participate in it. VEIL gives the economy verifiable authority without unnecessary identity exposure.

## What VEIL is not

- Not a KYC/AML bypass system. VEIL does not remove compliance — it removes unnecessary disclosure.
- Not a mixer or untraceable payment system. VEIL is not "anonymous spending"; it is accountable, context-specific economic agency.
- Not a Visa/Mastercard replacement, and not an x401/x402 competitor. VEIL does not replace those rails — it gives them a privacy-preserving economic identity layer.

## Existing implementation: the Midnight hackathon MVP

**Real Midnight ZK is implemented.** Compact circuits compile, the official Midnight proof server generates proofs, and the Midnight ledger verifies those proofs before the UI reports success. This runs against an **in-memory offline ledger**, not a public network. Credential issuance is mocked; purchases, API billing and swaps are simulated.

<p align="center">
  <img src="docs/assets/veil-app-ui-flows.png" width="720" alt="VEIL app — Vault, Share, Proof, Delegate flows">
</p>

<p align="center">
  <img src="docs/assets/veil-app-ui-vault.png" width="720" alt="VEIL app — My Vault, credential sharing, activity">
</p>

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

`dist/` alone is not a complete application. `npm run preview` only serves static assets. Private and public demo state are ephemeral; reset/restart invalidates the current identity and receipts. Missing compiler output or an unavailable prover causes failure, never a signature-only fallback. See [desktop quickstart](docs/DESKTOP-QUICKSTART.md).

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
- **Wave 2:** `authorizeWithPolicy` enforces the amount cap **inside the circuit** (`assert(amount <= maxAmount)`). The cap is a public circuit input committed in the proof transcript, so an over-cap request cannot produce a valid proof even if the Core's own pre-checks are skipped or bypassed.

Amount, target, action, consent and receipt expiry remain **Core-enforced policy** for the original `authorize` circuit. They are bound by the receipt digest but are not independently constrained by that circuit. The mock issuer does not prove real-world credential authenticity. The root secret and private witness transcript never enter API responses or source control.

## Verification boundary

`server/midnight.mjs` uses compiler-generated circuits, Midnight proof-server **8.0.3**, Compact runtime **0.15.0**, SDK **4.0.4** and ledger-v8 **8.0.3**. It calls the real prover, binds each transaction, invokes `wellFormed` with **contract/native proof and signature verification enabled**, and applies the verified transaction to the local ledger. The verification endpoint deserializes the submitted transaction bytes and verifies them again against retained historical public state.

Only fee balancing is disabled because this offline demo has no funded wallet. No `mockProve`, fabricated proof or network-finality claim is used. The browser checks the supplemental Ed25519 receipt signature and asks the local Core to verify the Midnight proof; it does not run the ledger WASM verifier itself.

## Concept architecture

<p align="center">
  <img src="docs/assets/veil-core-architecture.png" width="720" alt="VEIL core architecture — analog privacy system layers">
</p>

The MVP implements the core loop: Verified Root → Context Personas → Authorization → Unlinkability → Selective Re-Link → Revocation. The full system vision extends this into delegation, coordination and trust outputs across composable rails (x401/x402, cards, DeFi, bank rails) — VEIL composes with rails rather than replacing them.

## Brand

<p align="center">
  <img src="docs/assets/veil-visual-board.png" width="720" alt="VEIL visual board — analog privacy system">
</p>

<p align="center">
  <img src="docs/assets/veil-teaser-envelope.png" width="240" alt="VEIL sealed envelope — Protect Intent">
  <img src="docs/assets/veil-teaser-dossier.png" width="240" alt="VEIL dossier teaser">
  <img src="docs/assets/veil-teaser-intent-protected.png" width="240" alt="VEIL — Intent Protected">
</p>

<p align="center">
  <img src="docs/assets/veil-design-system.png" width="720" alt="VEIL design system — palette, typography, components">
</p>

A veil does not erase the person behind it. It controls what becomes visible, to whom, and when. All brand assets live in [`docs/assets/`](docs/assets/).

## Wave 2 delta (2026-10) — baseline vs. new work

**September baseline (Midnight Korea Hackathon):** 4 Compact circuits (`enroll`, `authorize`, `linkSelected`, `revoke`), proof-server verification, in-memory offline ledger. Policy (amount/action/expiry) enforced by the local Core and bound via the receipt digest.

**New in Wave 2:**
- `authorizeWithPolicy` circuit: the amount cap is asserted **inside the circuit**. Over-cap requests are rejected by the proof itself, with no Core pre-check in the path (`scripts/zk-smoke.mjs`: `circuit-policy-cap-enforced` / `circuit-policy-cap-rejected`).
- The enforced cap is a disclosed public input, committed in the proof transcript and bound into the `VEIL/policyAuth/v1` authorization record.
- The September baseline circuits are untouched; the new circuit is purely additive.

## Roadmap

| Stage | Deliverable | Status |
| --- | --- | --- |
| Midnight MVP | Local proof core, personas, authorization, selective links and revocation | Implemented; offline demo only |
| Policy circuit extension | Public per-request amount cap enforced inside `authorizeWithPolicy` | Implemented; no cumulative budget |
| Solana Devnet adapter | Owner-scoped native SOL intent, execution checks, configurable Helius RPC and status tracking | Initial implementation; offline tested, live validation pending |
| Confidential settlement evaluation | Assess Solana Rings and its fit with VEIL's privacy and delegation model | Research |
| Developer prototype | `veil-sdk`, x401/x402 adapters, wallet abstraction and secure Core transport | Planned |
| Production integrations | Durable revocation, real credential issuers, independent verifiers and reviewed payment execution | Future work |
| Longer-term clients | Mobile, NFC/QR commerce and agent-to-agent personas | Exploratory |

A limited mainnet pilot would follow successful Devnet validation and review of signing, policy enforcement, persistence and privacy boundaries. No mainnet availability or launch date is claimed.

## Privacy and remaining work

The trusted Desktop Core knows all persona relationships. The demo has one enrolled root, so its anonymity set is one; it demonstrates the circuit mechanism, **not production anonymity**. Timing and other metadata can still correlate actions. A selected-link disclosure cannot be undone after someone observes it.

The owner API and verifier screens share one local origin. Do not expose them publicly. Encrypted phone pairing, independent external verifiers, authenticated agent keys, private mandate circuits, durable revocation, a funded wallet and public-network deployment remain future work. Native mobile apps and real settlement remain outside the original Midnight UI demo. The separate Solana adapter adds an explicit Devnet-only transfer path with local policy; see [its boundaries](docs/SOLANA-DEVNET.md).

## Source map

- `contracts/veil.compact`: five exported provable circuits, including the additive `authorizeWithPolicy` circuit.
- `server/midnight.mjs`: proof generation, actual ledger verification and state transitions.
- `server/zk-core.mjs`: serialized ZK-backed authorization / link / revocation flow.
- `server/core.mjs`: receipt signing and execution policy; also tested independently.
- `server/http.mjs`: loopback API, owner-only Solana routes and frontend server.
- `server/solana/`: local payment policies, real Kit transaction construction and configurable Devnet RPC transport.
- `scripts/solana-devnet.mjs`: explicit Devnet connectivity check and owner-authorized CLI payment demo.
- `src/`: React/TypeScript owner and verifier UI; PWA assets in `public/`.
- `scripts/zk-smoke.mjs`: positive proofs and negative circuit/verifier tests.
- `docs/assets/`: brand and concept imagery used above.

See [security boundaries](docs/SECURITY.md), [validation](docs/VALIDATION.md), [desktop quickstart](docs/DESKTOP-QUICKSTART.md), and [contract details](contracts/README.md). Hosting, recording and submitting the hackathon form are not performed by this repository.
