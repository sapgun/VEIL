# VEIL — desktop landing + app

## Run the complete prototype

Node 22.14 or newer is required by this repository.

```sh
git clone https://github.com/sapgun/VEIL.git
cd VEIL
npm ci
npm run demo
```

Already cloned? Run `git pull --ff-only` before `npm ci`.

Open **http://127.0.0.1:43127/**. The top-right **APP ↗**, hero **Open app**, and footer **Enter the app** all navigate directly to **/app** in the same tab. No signup, installation, wallet connection, or intermediate screen is required to open the app.

- `/`: minimal editorial landing, supplied monochrome VEIL artwork, charcoal + parchment palette, three concise principles.
- `/app`: existing desktop Core dashboard. Create a mock verified root, choose a persona, authorize a fictional amount, inspect the signed receipt, execute once, and revoke.
- `/verifier?context=daily`: counterparty view for the selected context.

## A 60-second walkthrough

1. Open the landing and click **APP ↗**.
2. Click **Create mock verified root**. The local Core creates three contextual personas.
3. Keep **DAILY**, enter `12`, and authorize. Inspect the receipt and execute the simulated action.
4. Try an amount above the displayed limit to demonstrate rejection.
5. In the linking section, explicitly consent to link two personas; inspect the result.
6. Revoke a persona and demonstrate that a new authorization is rejected.

## Validation

```sh
npm run build
npm test
```

GitHub Actions also builds, runs the tests, and checks that `/`, `/app`, `/app/`, `/verifier` and the concept asset are served successfully. The `veil-desktop-build` artifact contains the compiled frontend, not the Node Core.

## Important runtime boundary

**The complete signed-mode app requires `npm run demo`, not a static-only host.** The Node Core intentionally listens only on `127.0.0.1`, validates the host and request origin, and keeps demo secrets in memory. These protections have not been weakened to expose it publicly. `vite preview` or a static deployment can display the landing, but does not provide `/api/*`; the app then reports the Core as offline.

This is a research prototype with a mock issuer and simulated economic actions. Ed25519 signed receipts are not Midnight zero-knowledge proofs. The Core knows persona relationships. No claim of an audit, deployed on-chain proof system, production anonymity, or encrypted phone pairing is made. Do not use real documents, identity data, or funds.

## Scope of this update

Desktop first. Removed phone mockups, architecture diagrams, decorative feature grids and neon visual styling from the landing. Preserved the existing Core, APIs, security checks and Compact contract source. The app receives the same restrained palette, without replacing its functional protocol with a cosmetic simulation.
