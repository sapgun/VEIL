# Midnight Compact policy scaffold

`veil.compact` expresses the intended private predicate using a witness, two assertions, and a public success counter. The raw age is not a ledger field or public circuit parameter. This source is not called by the frontend.

**Status: source scaffold only; compilation, proof generation and deployment have not been verified.** The language pragma follows the documented supported syntax. Compiler 0.30.0 is an explicit compatibility target, not a claim that it is the newest release. It uses Compact language 0.22 according to the [toolchain documentation](https://docs.midnight.network/compact/compilation-and-tooling/dev-tool-usage).

## Compile separately

Use Linux, macOS, or WSL with the official [Compact developer tools](https://docs.midnight.network/compact/compilation-and-tooling/dev-tool-usage) installed. Native Windows `compact.exe` is a disk compression utility and must not be used. The npm wrapper stops on native Windows for this reason.

```sh
compact update 0.30.0
compact compile +0.30.0 --version
npm run contract:check
npm run contract:build
```

`contract:check` passes `--skip-zk` for a compiler-only pass. `contract:build` runs full key generation. Generated output goes to `contracts/managed/veil` and is ignored. Toolchain installation and proving parameters can require substantial downloads. Web `npm run build` does not compile this contract.

## Meaning and limitations

- The circuit accepts a self-asserted witness age in 18–150 and increments the public `authorizations` counter. Failed constraints must reject the transition.
- A valid witness is **not evidence of a real person's age**. A malicious caller can supply any qualifying value. Credential issuer verification is intentionally absent.
- The counter is not an authorization token. It has no binding to an agent, action, user, nonce, or expiry. The circuit does not implement delegation or replay prevention.
- `witnesses.ts` supplies a structural adapter example. After compilation, check it against the generated `Witnesses<PrivateState>` type rather than casting around type errors.

## Integration acceptance checklist

1. Compile and test the generated circuit with ages 0, 17, 18, 150, 151; confirm only valid values advance ledger state. Check that witness data is absent from the public transcript.
2. Authenticate an issuer-backed credential inside the circuit; bind it to its holder. Proving a self-asserted number is insufficient.
3. Bind the proof to an explicit agent, action, chain/contract domain, nonce and expiry. Persist consumption in a trusted verifier/on-chain ledger; define revocation.
4. Wire matching Midnight SDK/provider versions, a trusted local proof service, wallet signing, and public ledger reads to the generated contract artifacts.
5. Test rejected proofs, replay, wrong scope, expiry, provider failure and transaction finality on a supported Midnight network. Display verified transaction IDs only after confirmation.
6. Enable a real-proof mode only after these checks pass. Keep simulation visibly separate.
