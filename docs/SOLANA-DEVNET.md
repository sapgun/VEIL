# Solana Devnet payment adapter

This is the first executable Solana integration: native SOL transfers built with
`@solana/kit` and `@solana-program/system`, simulated and submitted through standard
Solana JSON-RPC. A server-side Helius key selects Helius Devnet; otherwise the
public Solana Devnet RPC is used. No Helius-specific SDK is necessary for these
standard RPC methods.

## Implemented scope

- Local owner consent binds a recipient, persona, payer, asset, per-request cap
  and expiry to a server-owned payment intent.
- Execution checks the RPC genesis against Devnet before preparing a transaction.
- A real signed version-0 System Program transfer is simulated with signature
  verification, then submitted with preflight enabled.
- Authority is checked before preparation, after signing and after simulation.
- A synchronous reservation prevents duplicate execution of the same intent.
- The signature is retained before submission. Ambiguous network errors become
  `unknown`; the service reconciles that signature rather than rebuilding or
  sending a replacement. Confirmation and finalization are distinct states.
- Private keys and Helius credentials stay in the local process. Responses omit
  RPC URLs, signed transaction bytes and provider error details.

The first implementation uses status polling, not WebSocket subscriptions. SPL
tokens, x402, Solana Rings and an on-chain spending-policy program are not included.

## Setup

Use Node 22.14+ and the existing package lock:

```sh
npm ci
cp .env.example .env
npm run solana:keygen
```

Key generation writes a new dedicated keypair under ignored `.private/`, with
exclusive creation and restrictive file permissions. It never overwrites an
existing key. Do not use a mainnet wallet. The signer must be funded separately
with Devnet SOL from the [Solana faucet](https://faucet.solana.com/); no automatic
airdrop, key import or funding is performed.

Optionally set `HELIUS_API_KEY` in `.env`. This value is read only by server/CLI
code. Never prefix it with `VITE_`. Endpoint selection is fixed to Devnet and
verified by genesis, with no arbitrary URL supplied by HTTP clients.

```sh
npm run solana:check
```

This reads the configured RPC genesis and prints only the payer, provider and
network. It does not create an authorization or send a transaction.

## Explicit CLI payment

Set `VEIL_SOLANA_ENABLED=1` in `.env`, then use your intended Devnet recipient:

```sh
npm run solana:pay -- --recipient=YOUR_DEVNET_RECIPIENT --lamports=1000
```

The command creates an ephemeral local Core identity and an explicitly scoped
owner mandate, simulates, submits, and polls the returned signature. Its authority
mode is `local-owner-policy`: it does **not** generate a Midnight proof. Amounts
are decimal strings in lamports (1 SOL = 1,000,000,000 lamports), with an enforced
per-request ceiling of 10,000,000 lamports / 0.01 Devnet SOL, plus network fees.
The cap is not a cumulative budget.

Do not rerun a payment just because its outcome is `unknown` or `submitted`.
Inspect the printed signature in the Devnet explorer. A new CLI run creates a new
identity and intent, and can therefore cause an additional payment. State is
in memory, so restarting loses replay records; this is not production idempotency.

## Existing desktop Core integration

The existing app can enable the adapter while retaining its Midnight ZK setup.
Follow the normal compiler/proof-server setup in the root README, then run:

```sh
npm run build
node --env-file=.env server/http.mjs
```

Initialize the VEIL identity through the existing UI or `/api/owner/setup`.
All Solana routes require the existing `X-Veil-Session` owner token obtained from
`GET /api/session`, the same-origin/loopback checks, and JSON POST bodies. There
is no Solana UI yet. The existing purchase/API/swap demo actions remain simulated.

| Method and path | JSON body / purpose |
| --- | --- |
| `GET /api/owner/solana/info` | Enabled state, payer, provider and limits; no endpoint/key |
| `POST /api/owner/solana/mandates` | `{ "context": "api", "recipient": "ADDRESS", "maxLamports": "10000", "ttlMs": 60000, "consent": true }` |
| `POST /api/owner/solana/intents` | `{ "mandateId": "RETURNED_ID", "lamports": "1000" }` |
| `POST /api/owner/solana/execute` | `{ "intentId": "RETURNED_ID" }` |
| `POST /api/owner/solana/status` | `{ "intentId": "RETURNED_ID" }`; reconcile only, never resend |
| `POST /api/owner/solana/revoke` | `{ "mandateId": "RETURNED_ID" }` |

Mandates expire within 60 seconds and cannot outlive the current persona mandate.
Create a new intent only for a deliberately new payment. Execution responses must
be inspected: HTTP 200 can carry `failed`, `submitted` or `unknown`, and does not
mean settlement succeeded. `confirmed` can later advance to `finalized`.

## Trust and verification boundaries

The desktop adapter checks the current Core's root/persona state. Resetting the
Core, revoking the root/persona, or revoking the payment mandate invalidates
outstanding authority. However, the payment intent is **not included in the
existing Midnight proof transcript**. This is a trusted local execution adapter,
not a cross-chain verifier or trustless delegation system.

The CLI has only local signed Core authority. Neither mode proves possession of
an independent agent key, enforces a mandate on Solana, hides the sender/recipient
or amount, or prevents a key holder from spending outside VEIL. Network fees are
outside the transfer cap. Revocation blocks future local submission checks; it
cannot withdraw a signed/broadcast transaction or reverse a settled payment.

Signed transaction bytes are never returned to HTTP clients. The signer, Core,
provider and local machine remain trust boundaries. Public RPC confirmation is
not a Midnight proof. An absent status is not proof of failure or non-inclusion;
unknown outcomes remain reserved until independently reconciled. Persistence,
block-height expiry reconciliation, fee budgeting and independent verification
remain future work.

## Validation

```sh
npm run test:solana
npm test
npm run build
```

Automated tests use real Kit transaction construction, serialization and Ed25519
signatures against injected RPC responses. They decode the submitted transfer to
check payer, recipient and lamports, and cover HTTP owner checks, cap/expiry/
revocation, reset, replay/concurrency, wrong-network rejection, simulation failure,
uncertain submission and confirmation outcomes. These are not evidence of a live
Helius payment, live Devnet settlement, or execution on a local validator.

Manual connectivity validation on 2026-10-28 verified the public Devnet genesis
and simulated a real signed transfer from a fresh, unfunded temporary signer.
The RPC returned `AccountNotFound`, as expected for that signer. No transaction
was submitted; successful funded settlement and Helius connectivity remain unverified.

## Tooling choices and next work

- [Solana Kit](https://solana.com/docs/clients/official/javascript): RPC, codecs,
  transaction messages and signers; selected for this new adapter.
- System Program generated client: the initial native SOL transfer instruction.
- Helius Devnet: configured server-side; no production/mainnet Sender path.
- Next: funded Devnet transaction evidence, durable idempotency/reconciliation,
  agent-key authentication, SPL transfers and wallet UI. Add Token Program and
  Wallet Standard integrations when those flows are implemented. Anchor is relevant
  if policy enforcement moves into a custom on-chain program.

Choose Rings only after separately validating its access, signing model and privacy
guarantees. Basic RPC access does not establish Rings entitlement.
