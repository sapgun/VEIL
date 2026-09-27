# Validation record

Checked locally on 2026-09-27 with Node.js 22.14.0 and npm 10.9.2 on Windows.

| Check | Result |
| --- | --- |
| `npm ci` with committed lockfile | Passed |
| `npm run build` | Passed TypeScript checking and Vite production bundling |
| `npm test` | 16 tests passed with Vitest 4.1.11 |
| npm dependency audit | 0 known vulnerabilities at validation time |
| Production preview, real browser | Rendered successfully; no captured error/warning logs during initial checks |
| Fictional age 27 | AUTHORIZED; input cleared |
| Delegate once | EXECUTED simulation; execution button disabled |
| Fictional age 17 | NOT AUTHORIZED; delegation disabled |
| Boundary age 18 | AUTHORIZED |
| Edit after approval | Approval invalidated, delegation disabled |

The unit suite additionally covers malformed input, age 0/150, exact-deadline expiration, wrong scope, missing approval, denied approval, reuse, reset, failed reevaluation, mutated receipt objects and superseded receipts. Browser form activation was verified through keyboard input; automated pointer clicks in the embedded browser did not reliably target controls, so pointer behavior is not claimed as verified.

Not verified: physical mobile devices, a full accessibility audit, Compact compilation or generated runtime behavior, actual proofs, a wallet, Midnight transactions, hosted deployment, or hackathon submission acceptance. Expiry was covered with deterministic model tests rather than a timed browser wait.

The Compact wrapper intentionally refuses native Windows to avoid executing the unrelated Windows disk compression utility. Use the documented WSL/Linux/macOS path to validate the source separately. No compiler success is inferred from the web build.
