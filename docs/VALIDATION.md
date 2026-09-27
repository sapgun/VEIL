# v0.2 validation

Environment: Node.js 22.14.0, npm 10.9.2, Windows, 2026-09-27.

## Automated checks

- TypeScript checking and Vite production build pass.
- **26 tests pass** across the private Core and HTTP layer.
- Tests cover three context successes, deterministic/domain-separated persona derivation, missing root, tampered signatures, other-Core signatures, wrong context/challenge, invalid/over-limit amounts, replay, exact-deadline expiry, persona/root revocation, reset, receipt field minimization, consent, pair validation, link expiry and current revocation.
- HTTP tests exercise owner-token requirements, forbidden Origin and Host, the full request/execute/link/revoke flow, and malformed JSON.

These checks are for the local HMAC/Ed25519 implementation. They are not Compact or Midnight proof tests.

## Browser observations

Production app served by the actual Desktop Core at loopback:

- Mock root creation displays three distinct persona IDs.
- DAILY, API and DEFI each authorize, verify the signature and execute their simulated action.
- Replaying an execution yields a server rejection.
- Explicit DAILY + DEFI consent produces a same-principal Core attestation naming only that pair.
- Revoking DAILY makes its next authorization fail and leaves execution disabled.
- A 390px-wide mobile viewport renders without horizontal overflow.

Interactions were verified with keyboard-based browser automation; this does not establish physical-device touch or native-install behavior.

## Not verified / not implemented

- Compact compilation, generated circuit execution, actual ZK proofs, wallet signing, network transactions or cryptographic unlinkability.
- QR/encrypted mobile/Desktop pairing; loopback currently restricts use to the host machine.
- Native mobile app, real KYC/credential issuer, actual API commerce or settlement.
- Production hosting, multi-user isolation, physical-device PWA installation, full accessibility audit, video or hackathon submission.

The native-Windows Compact wrapper intentionally stops rather than invoking the operating system compression utility. No compiler success is inferred from web tests.
