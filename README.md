# VEIL

**Permission without exposure.** A minimal exploration of privacy-preserving delegated authorization for the Midnight Korea Hackathon.

An agent should learn whether it may perform a specific action, without receiving the underlying credential.

> **Delivery status:** working React/TypeScript **local simulation**, plus a Midnight Compact **policy scaffold**. The frontend does not generate or verify a ZK proof, connect a wallet, submit a transaction, or call the Compact contract. The contract has not yet been compiled or deployed. This is an experimental prototype, not production authorization.

## Run in two minutes

Requires Node.js 22.14+ and npm. No API keys, wallet, Docker, or environment variables are required for the web demo.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).

```sh
npm test
npm run build
npm run preview
```

The static production output is `dist/`. A hosting provider can build with `npm ci && npm run build` and serve that directory. No live deployment URL is claimed by this repository.

## 60-second judge demo

1. Start with the fictional age **27**. Press **Evaluate privately**.
2. The input clears and the agent panel reads **AUTHORIZED**. Open the receipt: it contains the decision and action scope, never the raw age.
3. Press **Delegate action**. The app displays **EXECUTED**, explicitly marked as a simulation. The button locks after one use.
4. Enter **17** and evaluate. The result becomes **NOT AUTHORIZED** and delegation stays disabled.
5. Try **18** for the passing boundary. Wait 60 seconds to show expiry, or edit the input to immediately invalidate authorization.
6. Show `contracts/veil.compact`: a private witness, fixed age constraints, and a public success counter. Explain that real proving and issuer authentication are the next integration milestone.

## Architecture and disclosure

```text
CURRENT WEB DEMO (entirely in the browser)
Fictional private input -> local policy evaluation -> unsigned receipt
                                                    -> one simulated action

COMPACT SCAFFOLD (separate from the UI)
privateAge() witness -> constraints: 18 <= age <= 150
                    -> increment public authorizations counter

NEXT INTEGRATION
Issuer-authenticated credential -> Compact proof -> verified scoped permission
                               -> independently verified agent execution
```

| Component | Implemented | Boundary |
| --- | --- | --- |
| React + TypeScript UI | Yes | Responsive, masked input, allow/deny/reset states |
| Session model | Yes | One use, fixed action, 60-second expiry; local UX guard only |
| Public-shaped receipt | Yes | Unsigned object; not a ZK proof or bearer token |
| Compact source + witness adapter | Scaffold | Compiler target 0.30.0; compilation unverified |
| Credential authenticity | No | User-entered age can be fabricated |
| Wallet / proof provider / Midnight deployment | No | No on-chain transaction or contract address |
| Real delegated agent execution | No | Only reserves fictional demo access in UI memory |

No raw input is transmitted, logged, stored in browser storage, or included in receipts by this code. React clears the input after evaluation, but this does not guarantee secure memory erasure. Someone controlling the browser can inspect memory or bypass all local checks. The decision still discloses that the age policy passed; it is not zero information disclosure. The Compact counter would also make successful activity public.

## Repository map

```text
src/App.tsx                   Interactive walkthrough
src/styles.css                Responsive interface
src/authorization.ts          Explicitly simulated session model
src/authorization.test.ts     Boundary, expiry, scope and replay tests
contracts/veil.compact        Minimal private witness policy scaffold
contracts/witnesses.ts        Structural TypeScript witness adapter
contracts/README.md           Compiler and integration instructions
scripts/compile-contract.mjs  Guarded Compact invocation
docs/SECURITY.md              Trust model and production gaps
docs/VALIDATION.md            Verification evidence and limits
```

## Midnight path

See [contract instructions](contracts/README.md). The UI deliberately does not import speculative Midnight SDK packages or display invented transaction hashes. Replace the local model only after compiled types, private-state, proof, wallet and public-data providers are integrated and independently tested. Do not accept an `authorized: true` JSON object as evidence of a proof.

Official references checked on 2026-09-27:

- [Compact language reference](https://docs.midnight.network/compact/reference/compact-reference)
- [Witnesses and contract structure](https://docs.midnight.network/compact/reference/writing)
- [Compact toolchain usage and version selection](https://docs.midnight.network/compact/compilation-and-tooling/dev-tool-usage)
- [Midnight examples](https://docs.midnight.network/examples)

## Security and submission

Use fictional credentials only. Never commit wallet seeds, keys, `.env` files, or private-state dumps. See [security notes](docs/SECURITY.md). No secrets are required by this prototype.

This repository supplies code and a demo script; hackathon eligibility, any required real-network integration, a hosted demo/video, and submission-form completion must be checked separately. Do not describe this version as a deployed ZK application.
