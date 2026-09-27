# Security model

This is a demonstration, not a security boundary. Do not use it to gate funds, personal data, or actual privileges.

## Local demo

- All evaluation and execution is in the same browser. Users can alter JavaScript and bypass checks.
- Values exist in input/React memory; masking is visual only. After evaluation the input is cleared, but garbage collection is not secure erasure.
- The app does not persist values in local/session storage, cookies, URL parameters, telemetry or logs, and contains no application fetch calls.
- Receipts are unsigned and contain policy, action, boolean result, random ID and timestamps. The ID is a local identifier, not a proof hash.
- Scope, expiration and single-use behavior are UI demonstrations, not cross-device or cross-session replay protection. Reloading creates a new session.

## Compact scaffold

The policy checks a private, self-asserted value. It does not authenticate a credential issuer or enforce actual delegation. The public counter reveals successful activity. A future proof provider may receive private witness material: use a trusted/local provider and document its trust assumptions.

## Repository hygiene

No secrets or environment variables are needed. `.gitignore` excludes environment files, keys, keystores and common wallet/seed JSON filenames, but filename exclusions are not a secret scanner. Inspect all staged content before publishing. Never put credentials in `VITE_*` variables: these are bundled into frontend assets. If a real secret is ever committed, revoke it immediately; deleting the file is insufficient.

Before production, add issuer verification, holder binding, scoped proof verification, nonce consumption, expiry/revocation, a trusted execution boundary and independent security review.
