# Validation — 2026-09-27

## Passed

- Compact 0.30.0 syntax/type check and **full proof-key generation** for `enroll`, `authorize`, `linkSelected`, `revoke`.
- Official Midnight proof-server 8.0.3 generated real proofs; ledger-v8 8.0.3 verified and applied them to an in-memory ledger with contract-proof verification enabled.
- `npm run test:zk`: DAILY/API/DEFI authorization proofs; consented same-root link; revocation proof; altered transaction rejected; circuit-level nonce replay, duplicate-context link, revoked authorization and revoked link rejected; execution replay, excess amount, missing consent and reset invalidation checked.
- Observed authorization transactions: 5,331–5,333 bytes; proof + validation around 3.7–4.0 seconds on this machine. Sizes/timings vary. Transaction byte count includes more than the proof.
- `npm test`: 29 Core, HTTP boundary and landing tests passed.
- `npm run build`: TypeScript and production frontend passed.

## Important limits

No network deployment/finality, funded wallet, real credentials, commerce settlement, independent external verifier, native app, encrypted phone pairing or physical-device PWA installation is claimed. Fee balancing alone is disabled for local proof verification. Policy semantics beyond root membership, derivation, revocation and nonce uniqueness are Core-enforced.

The compiler/prover ran using Linux on this Windows workstation. A project-specific `VEIL-ZK` WSL distribution was imported from the official proof-server image under `D:\DevEnv\WSL\VEIL-ZK`. Repository reproduction uses the documented supported compiler plus Docker Compose; generated binaries/keys are not checked in.

Browser validation also passed: root enrollment, authorization proof, simulated execution and consented DAILY + DEFI link proof. The concurrent desktop landing and /app route were preserved during integration.

