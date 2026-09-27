# Living Veil — scroll-responsive material study

An additive visual layer between the original hero/principle strip and Philosophy. All existing app actions, copy, privacy boundaries, backend, circuits and runtime dependencies remain unchanged.

## Rendering

The landing lazily imports a native WebGL2 engine only near the scene, on desktop widths of at least 960px, when motion is allowed. The originally considered Three.js dependency was not needed: this scene has two draw calls, one canvas and one mask texture. There is no new npm runtime dependency. Both shader programs render neutral grayscale; parchment belongs to the surrounding DOM.

A 96 x 56 tessellated sheet has a fixed upper edge, weighted lower-edge displacement and finite-difference surface normals. Bounded, filtered scroll velocity excites a damped spring. Reversing scroll reverses the force; it does not teleport the sheet. After input stops the spring settles and requestAnimationFrame stops. This is a visually physical spring-and-shader approximation, not collision/self-contact cloth simulation.

The three abstract head-and-shoulders contours represent one person's contexts, not real people or an identity-matching system. Progress alone controls separation, alignment, renewed separation and erosion. The merge uses maximum coverage, not additive opacity; the contours morph toward one center mask. Dissolve noise is spatially seeded, so reversal is reproducible. Disappearing silhouettes do not imply deletion of information previously disclosed.

## Controls and budgets

- Native page scroll; no wheel/touch interception, scroll smoothing library or body locking.
- The header and all four existing `/app` anchors remain DOM elements, outside the canvas.
- Motion on/off persists only a preference in localStorage. No interaction telemetry is sent.
- `prefers-reduced-motion` overrides motion; narrow screens use still artwork.
- A real Skip scene anchor bypasses the animation.
- Pause when outside the observed area and when the tab is hidden. Dispose listeners, observers, RAF, image handlers, GPU buffers/programs/texture and context on unmount or opt-out.
- Start at at most 1.5 DPR and 1.8 million pixels. Sustained slow frames reduce the budget to 950k and 520k; sustained poor performance after that uses the still fallback. These are conservative budgets, not a device-independent 60fps guarantee.
- Missing WebGL2, shader/texture initialization failure, asset timeout, context loss or dynamic-import failure returns to the static scene.

## Assets

`public/veil/motion/silhouettes.svg`: original three-cell vector mask atlas (1536 x 768).
`context-1.svg` through `context-3.svg`: original standalone abstract contours (512 x 768).
`still.svg`: original static grayscale gauze composition (1440 x 720 vector viewbox). No font, stock photo or external image dependencies.

## Validation

`physics.test.ts` checks deterministic story/reversal, bounded impulses, settling, frame-rate consistency and pixel budgets. `scripts/test-living-veil.mjs` checks the built page in Chromium with WebGL2, story frames, resting RAF, toggle persistence, live reduced-motion changes, context loss, no-WebGL fallback, mobile overflow and direct APP navigation. The browser workflow installs Playwright as a temporary QA tool, not a production dependency. Its screenshots and results are uploaded as `living-veil-browser`.

Existing `docs/EDITORIAL-PACKAGE.sha256` remains the historical editorial-1 package manifest; this additive motion update intentionally changes `LandingPage.tsx` and is recorded separately here.

Reference implementation guidance (no source code copied):
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
