# VEIL

**Unlink by Default. Link by Consent.**

One verified principal. Multiple context-specific economic personas. Reveal a relationship only when the owner chooses.

VEIL explores a Private Economic Identity Layer for agentic commerce. The hackathon walkthrough covers **DAILY / POS, API and DEFI**, scoped authorization, selective same-principal disclosure and revocation.

> **v0.2 delivery status:** a working local Desktop Core and mobile-first web/PWA shell. Persona derivation, digital signatures, signature verification, scope checks, consent, expiry, replay prevention and revocation are implemented. The credential issuer is mocked and commerce actions are simulated. **This is NOT a Midnight ZK application yet.** The revised Compact contract is an uncompiled integration scaffold, not the engine behind the UI.

## Run

Node.js **22.14+**, npm, and a modern browser with Web Crypto Ed25519 support are required. No API keys, wallet, account or environment file is needed.

```sh
npm ci
npm run demo
```

Open **http://127.0.0.1:43127/**. The command builds the frontend, then starts the loopback-only Desktop Core serving both the app and API. `npm run dev` is an alias for the same complete demo (no hot reload). After code changes, stop the process and run it again.

```sh
npm test           # Core + HTTP integration tests
npm run build     # TypeScript check + frontend bundle
npm start         # serve an already built app with Core
```

`npm run preview` serves only static UI assets and cannot authorize or link personas. Use `npm start` for the complete experience. `dist/` alone is no longer a complete deployable app. State is ephemeral; restarting the Core clears the demo identity and changes the signing key.

## Three-minute demo

1. **Create mock verified root.** A cryptographically random root secret stays in Core memory. Three different HMAC-derived persona IDs appear in the owner dashboard.
2. **DAILY:** request authorization for 12 demo units, then execute a fictional cafe purchase. Open the verifier view and inspect the receipt. It contains the DAILY identifier and approved action, not the root or other persona IDs.
3. **API:** select API, request 2 units and execute the API simulation. **DEFI:** select DEFI, request 25 units and execute the sandbox swap. No external commerce or funds are involved.
4. **Link by consent:** select DAILY + DEFI, explicitly check consent, then create the signed link attestation. Only that pair is included; API's identifier is omitted. The browser verifies the signature and the Core checks current validity.
5. **Revoke DAILY**, select it and request authorization again. The request is denied. API remains usable. Root revocation instead invalidates every persona.
6. Demonstrate a negative case: **Test replay rejection** after execution, request above a mandate limit, or wait 60 seconds before execution. The server rejects these even if UI checks are bypassed.

The owner dashboard intentionally knows all three personas. Counterparty screens are separately scoped response views in the same trusted local app, not independently isolated external services.

## What is real, mocked, and pending

| Capability               | Status                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Context personas         | HMAC-SHA-256 with a random 32-byte root and context/target domain separation                                             |
| Private state placement  | Root is held in Node Core memory, never returned in API responses                                                        |
| Authorization receipts   | Real Ed25519 signatures; browser verifies exact payload bytes against the connected Core public key                      |
| Scope / expiry / replay  | Server checks fixed action and target, per-action amount, challenge and 60-second expiry; atomic one-use consumption     |
| Selective linking        | Explicit owner consent; real signed **Core attestation**, not a same-root ZK proof                                       |
| Revocation               | Core-enforced persona or root revocation, including outstanding receipts and current link validity                       |
| Credential issuer        | Mock registration; no KYC, external issuer or real credential authenticity                                               |
| POS / API / DeFi actions | Local simulations with signed execution receipts; no settlement                                                          |
| PWA                      | Responsive layout, manifest, icon and app-shell service worker; physical-device installation not validated               |
| Mobile/Desktop pairing   | Not implemented; Core binds only to loopback                                                                             |
| Midnight                 | Persona/membership/link/revocation Compact source scaffold; compilation, proving, wallet and network integration pending |

## Privacy boundary

```text
Owner PWA / browser
     | explicit authorization or pair-link consent
     v
Trusted local Desktop Core
  private root + mock issuer + persona/mandate state
  HMAC persona derivation + Ed25519 attestation signing
     |
     +--> DAILY receipt --> POS simulation
     +--> API receipt   --> API simulation
     +--> DEFI receipt  --> DeFi simulation
     +--> selected-pair statement only after consent

Future: replace trusted Core assertions with verified Midnight ZK proofs
```

Different persona IDs and absence of a shared root ID reduce explicit correlation in the receipt schema. **They do not establish cryptographic unlinkability or anonymity.** The Core knows the entire relationship graph; timing, amounts, network metadata and a small anonymity set can still correlate activities. The single-owner local demo is not a privacy deployment.

Signatures prove that the connected Core attested to the payload; they do not prove the Core is honest. The public key is trusted through the local connection, not an external issuer registry. Capabilities are bearer-style demo receipts: the `subject` names a generated agent session, but possession of an agent private key is not checked.

## Repository

```text
src/App.tsx              Owner dashboard and scoped counterparty view
src/protocol.ts          Typed API client and browser signature verification
server/core.mjs          Private state, persona derivation, signed receipt lifecycle
server/http.mjs          Loopback API + static app server
server/*.test.mjs        Core and HTTP boundary tests
public/                 PWA shell assets (never caches API responses)
contracts/veil.compact   Midnight integration scaffold
contracts/witnesses.ts  Structural witness adapter
docs/SECURITY.md         Explicit trust model and deployment restrictions
docs/VALIDATION.md       Verified evidence and remaining limits
```

See [Compact integration](contracts/README.md) before attempting a real proof. The local HMAC protocol and Compact hash construction are intentionally separate; generated Midnight artifacts are not loaded by the app.

## Submission and next milestone

The product flow now follows contextual personas and owner-selected linking. Completing the original Midnight acceptance bar still requires compiled/tested circuits, real membership and same-root proofs, private mandate enforcement, a wallet/proof bridge and network validation. Native mobile apps, real payments and real DeFi remain outside this iteration.

Do not submit this as a completed ZK implementation. Hosting, a recorded demo and the actual submission form have not been completed. Do not expose the local owner API publicly without a redesigned authentication, transport and storage boundary.
