# VEIL / C revision: a material across the page

The earlier standalone Living Veil stage has been removed, not hidden. Its WebGL engine, procedural human contours, striped fallback and 210svh track are deleted. The editorial page flows directly from hero and principles to Philosophy again.

## Art direction and implementation

Three different, broad asymmetric SVG sheets create a low-contrast grayscale atmosphere behind the entire landing. They have Gaussian-diffused edges and independent curvature; there is no repeated path or tiled curtain pattern. Foreground text, cards, inputs and the APP header remain above the material and are not blurred or transformed. The texture does not intercept pointer events.

A bounded, time-based damped spring drives small independent compositor translations/rotations from scroll velocity. Motion settles and stops requesting frames at rest, pauses when the document is hidden, and cleans up listeners/observers on opt-out or route exit. This is a layered material-motion approximation, not a cloth collision simulation. There is no WebGL requirement or added runtime dependency.

The hero uses three echoes of the SAME supplied photographic presence. They align, separate and fade during ordinary hero scrolling; the side layers fade out at alignment rather than stacking into a dark blob. This is not a multi-person identity-matching operation. No full-screen scene, sticky storytelling track, scene captions or extra scroll length is introduced.

## Assets and limits

`public/veil/atmosphere/presence.webp` derives from the existing supplied concept `docs/assets/veil-teaser-dossier.png`. The native crop is [128,16,496,496] from a 512px source, with photographic diffusion and a soft #111 matte on a 512x640 canvas. The subject is NOT newly drawn, vector-traced or AI-upscaled. The blur is intentional atmosphere, not a claim of new high-resolution portrait detail. Rendered width is capped at 256 CSS pixels; mobile uses 218px.

The three SVG sheets and the WebP total 6,941 bytes before transport compression. Exact file hashes and source coordinates are in `public/veil/atmosphere/manifest.json`. No font assets are added.

## Mobile and accessibility

Narrow screens get one composed photographic presence, not a failed-animation poster. No Motion off or Skip scene controls appear before content. The small Ambient motion toggle is in the footer and preserves the prior `veil:motion:v1` preference. The system reduced-motion setting stops movement and removes the unnecessary toggle. A blocked storage API does not prevent operation. A missing photo quietly removes the photographic layer without affecting text or app links.

Mobile hero scaling/negative margins from the previous layout are overridden so artwork no longer crosses the next section. Anchor clearance follows the real header height. The APP link and all four app CTAs are unchanged.

## Validation

`npm run build` performs the existing full TypeScript and Vite build; `npm test` includes eight kinetic tests and the updated eight landing contract tests in addition to unchanged Core/HTTP tests. `.github/workflows/living-veil.yml` now runs the C browser suite and publishes desktop/mobile production-build screenshots as `veil-atmosphere-c-browser`. The suite verifies asset hashes, old-stage removal, continuous fixed material, photo alignment/reversal/fade, controls/consent, motion preference, resting RAF, reduced motion, five widths, missing-photo fallback, blocked storage and APP navigation.

The server, app, Compact circuits, dependencies and original CI are unchanged. Historical editorial-package checksums remain historical; this C revision is not byte-identical to the old design package. Live Vercel hosting status and browser screenshots from the built artifact are separate forms of verification.
