# Trust model and security boundaries

## Implemented local prototype

The trusted Node process holds one mock root, all three persona relationships, per-persona mandates, revocation state, pending challenges and an Ed25519 signing key. State is memory-only; restarting clears everything. Reset clears the root buffer and maps, but JavaScript runtime memory is not a guaranteed secure-erasure environment.

HMAC-SHA-256 derives different identifiers from one random 32-byte root, with version/context/target domain separation. A fixed persona is intentionally linkable **within** its context. Distinct identifiers alone do not establish unlinkability across contexts; timing, amounts, endpoint metadata, the issuer and Core remain correlation surfaces.

Receipts are exact UTF-8 JSON payload strings with base64 Ed25519 signatures. Browser verification uses the key fetched from the connected Core, not a key in the receipt. This demonstrates cryptographic integrity, not independence from that Core's trust. Root secrets and signing keys are never serialized through an API.

The Core checks current root/persona validity, mandate expiry, the fixed action and target, a positive integer per-action amount, nonce, expiry and single use. It repeats checks at execution time, so revocation after issuance blocks execution. There is no cumulative spending budget or real settlement. `subject` is a random session label, not authenticated proof that a specific external agent possesses a private key. A signed authorization is a bearer-style capability within its short scope.

Selected-link attestations require explicit consent and exactly two distinct active personas. The excluded persona and root identifier are omitted. Anyone with the statement learns the selected relationship and can retain it; expiry/revocation cannot erase knowledge already disclosed. Signature validity and current authorization validity are different: consumers must query current status or validate against a trusted revocation registry. Historical signatures remain mathematically valid after revocation.

## HTTP boundary

- Server binds only to `127.0.0.1` and accepts the exact loopback Host.
- Cross-origin and cross-site browser requests are rejected. No permissive CORS headers are added.
- Owner routes require a random in-memory token acquired through the same-origin bootstrap.
- Mutations require JSON; request bodies are bounded. API responses are `no-store`.
- A restrictive Content Security Policy, no-referrer policy and MIME sniffing protection are sent.
- PWA caching excludes **all** API responses. No private-state browser storage or telemetry is implemented.

This is **not multi-user authentication**. Any trusted local process or same-origin code can obtain the owner bootstrap token. The verifier views are response-minimization demos in the same local trust boundary, not isolated tenants. Do not bind this server to a public interface, add a tunnel, or publish the owner API. Remote/mobile pairing requires authenticated encrypted sessions, lifecycle/revocation, secure key storage and a separate threat-model review.

## Midnight and deployment gaps

The Compact scaffold has not been compiled or audited and is not used by the server. It does not yet enforce full mandate semantics, root revocation, network domain separation or real proof verification. Do not describe Core attestations as ZK proofs or the mock issuer as actual KYC.

Only fictional data should be used. No keys or wallet credentials are needed. `.gitignore` excludes environment files and common key formats but is not a complete secret scanner. Never add credentials to `VITE_*` variables or frontend source. No generated private state, seed, signing key or owner session token belongs in screenshots, logs, source or receipts.
