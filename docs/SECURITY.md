# Security and privacy boundary

The main app uses real Midnight Compact circuits and real ZK proofs. `wellFormed` verifies contract/native proofs and signatures, followed by ledger application. Only fee balancing is disabled for the unfunded offline demo. There is no public-chain consensus, persistence or finality.

The trusted Node Core holds a random root, mock issuer secret, all persona relationships, mandates, receipts and an Ed25519 signing key in memory. The **local proof server also receives private witness data**. Remote proof-server URLs are rejected. Reset overwrites available secret buffers, but JavaScript does not guarantee secure erasure of all copies.

Persona IDs use Compact `persistentHash` with version and context domain separation. They are stable and linkable within a context. Membership paths and root secrets are witnesses, not API output. However, the demo enrolls only one root: the anonymity set is one. Network/timing/amount metadata, the issuer and Core remain correlation surfaces. This demonstrates privacy mechanisms, not production anonymity or audited unlinkability.

Authorization ZK proofs bind the exact signed receipt digest and nonce to a derived persona, check root membership, check revocation and reject repeated circuit requests. **Amount, target/action, consent and expiry remain Core-enforced**, not independent circuit constraints. They are bound to the proof via the receipt digest. Execution additionally checks current revocation, expiry and single-use consumption. No cumulative budget or real settlement exists. The random `subject` label is not proof of an external agent key; receipts are bearer capabilities.

Selective links require explicit consent and exactly two active personas. The circuit proves derivation from one hidden root and omits the third persona. Disclosure cannot be undone; historical proofs remain valid statements about historical public state after revocation. Current validity is checked separately. Root revocation proves revocation for all three known contexts; no general root revocation registry is claimed.

## HTTP and browser

- App binds to `127.0.0.1`; exact Host and same-origin checks apply.
- Owner routes require an in-memory token from same-origin bootstrap.
- JSON bodies are capped at 16 KiB; API responses are never cached.
- CSP, no-referrer and MIME sniffing protection are set; the PWA caches only shell assets.
- The browser verifies the supplemental Ed25519 receipt signature, then calls the Core's real Midnight verifier. It does not independently run the ledger WASM verifier.

This is not multi-user authentication: trusted local programs and same-origin code can obtain the token. Counterparty screens minimize response fields but share the same trusted origin. Do not tunnel or publicly expose the owner API. Phone pairing requires authenticated encrypted transport, protected keys and its own threat model.

Only fictional data is supported. No wallet credentials or API keys are required. Never commit secrets, private witness transcripts, owner tokens or generated private state. Generated contract artifacts and environment/key files are ignored. For the original Midnight UI path, real issuer authentication, agent possession proofs, private mandate constraints, network/contract domain separation, durable revocation and an independent verifier deployment remain unfinished. The separate external-agent adapter adds Ed25519 key-possession and signed request checks; it does not add those facts to the Midnight proof transcript.

## Optional Solana Devnet adapter

The separate Solana adapter uses owner-issued local mandates, checks current Core persona/root state, and signs public native SOL transfers using a dedicated Devnet keypair. Its payment policy is not bound into the existing Midnight proof transcript. It is disabled by default in the desktop server. Existing Midnight UI actions remain simulated. See [Solana Devnet boundaries](SOLANA-DEVNET.md) for signer custody, fees, replay persistence, ambiguous submissions and revocation limits.

## External-agent delegation

The opt-in external-agent path registers an owner-approved public key, verifies an expiring possession challenge, delivers immutable mandate offers and requires the agent to sign acceptance. Signed payment requests use a transactional SQLite cumulative budget and replay records before entering the existing Devnet executor. Agent and mandate revocations are checked around asynchronous preparation/simulation. The signature is persisted before broadcast and uncertain outcomes remain reserved.

The payer signing key remains trusted locally. This is not on-chain policy or Midnight-attested agent delegation. A reset/restart still loses the original Core persona authority, while agent budgets and replay metadata remain stored. Interrupted preparation is held for investigation, not automatically retried. See [protocol boundaries and persistence rules](AGENT-DELEGATION.md).
