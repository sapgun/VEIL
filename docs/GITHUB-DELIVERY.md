# VEIL editorial implementation — repository delivery

This delivery installs the completed landing implementation and production asset pack into the existing VEIL repository. The 62 files listed in `EDITORIAL-PACKAGE.sha256` are byte-for-byte identical to the previously delivered implementation package.

## Scope

- Replace `src/Landing.tsx` and `index.html` with the reviewed editorial entry point and metadata.
- Add the isolated React landing, reusable components, styles, 45 production assets, asset manifest, implementation notes and source/license documentation.
- Keep `src/App.tsx`, `src/main.tsx`, the existing application styles, all server code, Compact contracts, package.json, package-lock.json and the existing CI workflow unchanged.
- Update `src/Landing.test.tsx` from the previous layout's three assumptions to eight editorial contract tests. The new page intentionally has four direct app links, a 256/512 WebP picture, and clearer local-versus-public proof limitations.
- Include two asset-generation scripts and the original package checksums for reproducibility. Python is an asset-authoring tool, not a production or npm build dependency.

## Verified before delivery

The GitHub Actions preparation run generated assets from the exact approved portrait already present at `docs/assets/veil-teaser-intent-protected.png` (Git blob `784039406259d36d97e466a11633eeb7229ecf33`). Pinned Pillow 12.3.0 and CairoSVG 2.8.2 reproduced the delivered files; every entry in the 62-file SHA256 manifest passed.

Preparation run: https://github.com/sapgun/VEIL/actions/runs/36333104796

- `sha256sum --check docs/EDITORIAL-PACKAGE.sha256`: passed, all 62 files.
- `npm ci`: passed using the existing lockfile.
- `npm run build`: passed, including TypeScript semantic checks and Vite production build.
- `npm test`: passed, eight landing tests plus 26 unchanged Core/HTTP tests.

The temporary asset-upload workflow is deliberately excluded from this delivery. Production assets are ordinary repository files; no asset-generation workflow or additional write permission is required to build or deploy them.

## Historical package notes

`DESIGN-IMPLEMENTATION.md` and `DESIGN-QA.md` preserve the original package's authoring-stage status, including its then-pending GitHub upload and full-repository build. This delivery supersedes those pending upload/build notes. Their browser screenshots and offline QA refer to the packaged implementation, not to a subsequent live hosting audit. The standalone preview, screenshots and installer remain in the original ZIP; they are not production dependencies.

## Release checks

The existing main-branch CI remains the source of truth for Compact compilation, local Midnight proof verification and HTTP deep-link checks. Vercel's deployment status separately reports hosting/build completion. Successful frontend deployment does not mean that the public site hosts the trusted local Node Core or proof server.

All product links go directly to `/app`. The disclosure interaction on the landing remains explicitly fictional and does not transmit data or generate a proof. Existing application runtime and protocol limitations are unchanged.
