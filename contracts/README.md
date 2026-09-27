# VEIL Compact circuits

Compiled and proved with Compact **0.30.0**, runtime **0.15.0**, proof-server / ledger **8.0.3**. This is a compatibility-pinned set, not a claim of the newest releases.

```sh
compact update 0.30.0
npm run contract:check  # syntax/types, no keys
npm run contract:build  # full keys + ZKIR + generated JS
npm run test:zk        # requires local proof server
```

Generated artifacts are ignored at `contracts/managed/veil/`. The real Core imports generated JS and loads `.prover`, `.verifier` and `.bzkir` files. Recompile after any contract edit. The structural witness example in `witnesses.ts` is illustrative; the actual runtime adapter is in `server/midnight.mjs`.

- `enroll`: issuer-secret knowledge gates adding a root commitment to a Merkle tree.
- `authorize`: private root membership, context-derived persona, revocation and nonce replay checks; commits to the exact receipt digest.
- `linkSelected`: two distinct contexts derived from the same hidden root; both must be active; binds the selected-link receipt digest.
- `revoke`: private root membership authorizes persona revocation.

The adapter rehashes the public Merkle tree after decoding its state before transcript partitioning. This handles the SDK 2.5.0 state-conversion cache behavior without changing leaves or skipping proof checks.

The current circuit does not independently enforce amount/action/expiry/consent policy. Those fields are checked by the Core and bound via the receipt digest. Root revocation in the UI proves revocation of all three known personas; there is no universal on-chain root-revocation registry. Network/contract-specific domain separation, issuer lifecycle and production anonymity analysis remain required.

References: [Compact tools](https://docs.midnight.network/compact/compilation-and-tooling/dev-tool-usage), [official compatibility matrix](https://github.com/midnightntwrk/midnight-sdk/blob/main/COMPATIBILITY.md), [Compact reference](https://docs.midnight.network/compact/reference/compact-reference).
