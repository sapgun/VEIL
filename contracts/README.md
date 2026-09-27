# VEIL Compact integration scaffold

The source now models the actual VEIL direction: issuer-gated root enrollment, hidden membership, domain-separated personas, authorization commitments, selected same-root links and persona revocation.

**Status: uncompiled source scaffold.** It is not called by the web demo and has no deployed address or generated proof artifacts. There is no claim that these circuits currently compile or provide a reviewed privacy protocol.

## Source design

- `enroll`: checks knowledge of the issuer secret before adding a root commitment to a Merkle tree.
- `checkedRoot`: checks the private path leaf against the hidden root secret and the derived Merkle digest against the public tree.
- `authorize`: derives a context persona, rejects revocation/reused requests, and records a commitment binding persona, request digest and nonce.
- `linkSelected`: uses one private root to derive two chosen context personas, checks both are active, and records a challenge-bound pair commitment. It does not include a third persona.
- `revoke`: requires root knowledge/membership to revoke the derived context persona.

The sketch uses a Merkle path rather than publicly looking up a root identifier during each authorization. That choice avoids introducing an obvious shared root key in the authorization lookup, but does not itself prove end-to-end unlinkability. Enrollment, transaction metadata, the membership set size and other transcript data need review.

## Compile

The compatibility target remains **Compact toolchain 0.30.0**. It is not a claim of the newest release. Use the official [Compact tools](https://docs.midnight.network/compact/compilation-and-tooling/dev-tool-usage) on a supported Linux/macOS environment (or a properly configured WSL development distro).

```sh
compact update 0.30.0
compact compile +0.30.0 --version
npm run contract:check
npm run contract:build
```

`contract:check` skips proof-key generation. `contract:build` performs the full compile. Both use the version-pinned wrapper and write ignored generated output to `contracts/managed/veil`. Native Windows is rejected to avoid invoking Windows' unrelated `compact.exe` compression utility.

The current machine had no Midnight compiler or ordinary Linux development distro available; only a Docker-internal WSL distro was listed. No operating-system installation or manipulation of that internal distro was performed.

## Mandatory integration gaps

1. Compile against the selected toolchain, repair any syntax/type/disclosure incompatibilities and test generated circuit execution. The consulted online reference may describe newer language releases.
2. Implement issuer enrollment and membership-path construction using generated types. The generic witness adapter must be checked against the generated `Witnesses` type, not cast to hide errors.
3. Enforce mandate fields **inside the circuit**. The current `requestDigest` only binds a request: it does not constrain amount, target, agent, action or expiry by itself.
4. Define network/contract domain separation, authenticated agent possession, trusted clock semantics, root revocation and issuer revocation. Current source only sketches persona revocation.
5. Define verifier consumption and link disclosure semantics. Owner consent is handled by the current UI/Core; a future proving API must authenticate the owner and bind the exact pair and intended verifier.
6. Wire compatible Midnight private-state, proof, wallet and public-data providers. Local HMAC/Ed25519 values are **not byte-compatible** with Compact's hash construction; do not reuse their IDs as if they were generated circuit outputs.
7. Test wrong root/path/issuer/context, replay, revocation, mismatched pair and transcript disclosure; then verify actual proofs and network finality.

References consulted: [Compact reference](https://docs.midnight.network/compact/reference/compact-reference), [ledger data types](https://docs.midnight.network/compact/reference/ledger-adt), [standard library](https://docs.midnight.network/compact/standard-library/exports), and [official compiler platforms](https://github.com/LFDT-Minokawa/compact).
