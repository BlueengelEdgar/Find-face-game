# V0.5 review draft — second-level capacity decision pending

This branch is **not the completed V0.5 release**. Do not merge/deploy until the second-level constraint decision and visual/device acceptance are complete. Based on main `8e7d42b` (V0.4).

## Implemented

- Exactly five large, distinct existing characters in a staggered tutorial composition; one batch, then the existing celebration and only NEXT LEVEL.
- Top-left slot badges 1–5 on target cards, retained with completion marks, reset for each new batch. No wall identity numbers; any-order matching unchanged.
- Per-level instruction, Chinese explanation, 3/2/1/GO opening: nominal 3.3 seconds. Input/time blocked until GO; next level and retry replay the opening. Visibility pauses nest with opening/batch/viewport pauses.
- Batch panel glow + 12 bounded sparkles; all five outgoing cards enlarge and fly upward with rotation; incoming cards fly in, overshoot, and settle. 280 ms exit + 350 ms entrance + up to 80 ms stagger = 710 ms. Clock/input locked throughout. Final batch goes straight to celebration.
- Existing art, alpha-based Phaser hit tests, +3-second errors, haptics fallback, celebration, fake rankings and Pages workflow preserved.

## Explicitly unresolved: second-level population and natural layout

Production second-level layout files and population selection remain the **unchanged V0.4 baseline (75 on taller layouts, 45 on compact layouts)**, so this branch must not be presented as fulfilling the requested 150-person V0.5 second level. No further population reduction, portrait shrinking, pagination or rule change has been applied without authorization.

A separate diagnostic uses all 150 unique existing resources at widths 0.175–0.185 × wall width, with deterministic 2D best-candidate sampling (not rows or a jittered grid). It is **not wired into gameplay**. The diagnostic is reproducible via `npm run test:capacity` (Python Pillow/numpy required).

- Actual Phaser wall: 370 × 595 CSS pixels in a 390 × 844 viewport.
- Foreground occupancy: about 94.2%.
- 145/150 characters fail the >=85% upper-head visibility test.
- 17/150 lack a stable central-face touch witness (the failure is not merely a transparent rectangular hitbox).
- Minimum upper-head visibility: about 22.3%.

[150-person failed diagnostic](screenshots/v05-150-diagnostic.jpg) is an actual Phaser rendering, not a playable accepted level. Bottom targets belong to the tutorial used to boot the renderer and do not constitute a 150-person target test. `v05-150-measurement.json` records every character; `v05-150-diagnostic.json` records normalized sample coordinates.

The necessary-area bound in `v05-capacity.json` sums actual alpha>=96 upper-head pixel masks, with per-character source anchors, scaled to the **minimum** regular V0.4 portrait width. At least 85% of each mask would have to remain visible simultaneously. Required visible area is ~138% of a 370×594 wall and ~173% of a 300×382 wall, before body/background gaps. Even a smaller mask ending at face-anchor+0.06 requires ~112%/~141%. The mask is an automated proxy, **not hand-annotated semantic face/hair/accessory ground truth**. This bound and the failed sample support a real capacity problem under the existing measurement standard; a single failed sample alone does not prove every possible composition impossible.

Need user decision among: (a) retain 150/portrait size/visibility and allow separate areas/pages; (b) retain fixed view/portrait size/visibility and authorize measured fewer characters; (c) retain 150/fixed view and authorize smaller portraits with renewed touch/visual acceptance. None selected as of this draft.

## Preview images

- [Five-person tutorial, 390×844](screenshots/v05-tutorial.jpg)
- [Short phone, 320×568](screenshots/v05-short-phone.jpg)
- [Batch flight over unchanged V0.4 second-level baseline](screenshots/v05-batch-flight.jpg)
- [Tutorial celebration](screenshots/v05-celebration.jpg)
- [Failed 150-person diagnostic](screenshots/v05-150-diagnostic.jpg)

## Verification scope

`npm ci`, `npm test`, `npm run build` run in the managed environment. Browser regression uses real Chromium canvas rendering and dispatched touch events, **not real iPhone Safari**. Dimensions: 390×844, 320×568, 768×1024, 1366×768; portable HTML additionally tested at 1440×1000 offline. The V0.4 second-level baseline is tested as a regression, not as evidence that 150 people pass.

Real iPhone Safari, browser-toolbar/safe-area behavior on physical devices, finger accuracy, hardware haptics, physical-device FPS/memory, and human visual approval remain untested. Phaser's existing ~1.5 MB JS chunk still triggers Vite's >500 kB warning; production build succeeds. Art remains local and unchanged, tutorial preloads only five portraits; second-level images remain lazy-loaded.

## Review / deployment

Branch: `feat/v05-crowd-experience`. No main changes, merge, Pages permission changes or publication performed. Existing Pages remains the previously merged release until a human merges an accepted branch and the existing workflow succeeds. Local preview: `npm ci && npm run dev` then `/Find-face-game/` on the shown local address. Offline build: `dist/find-crowd-v05.html`; packaging helper labels it a review draft.

## Changed files

- `src/main.js`, `src/model.js`: badges, cancellable opening and batch choreography, nested timer/input locks.
- `src/levels.js`, `src/layout-first*.json`, `src/scene.js`: five-person tutorial and five-image initial preload. Second-level layout files unchanged.
- `index.html`, `src/style.css`: intro overlay, slot badge styles, overflow-safe target effects.
- `tests/model.test.js`, `tests/v05-browser.js`, `tests/v05-regression.js`, `tests/visual-measure.js`: state, touch, alpha-area and responsive regression.
- `scripts/measure-v05-capacity.py`, `scripts/seed-v05-diagnostic.mjs`, `tests/v05-capacity-preview.js`, `docs/v05-*.json`: reproducible 150-person capacity evidence, outside production gameplay.
- `scripts/build-portable.mjs`, `scripts/package-trial.py`, `package.json`, lockfile: V0.5 draft artifact names, test commands and version.
- `docs/screenshots/v05-*.jpg`: actual gameplay/diagnostic previews.

GitHub branch push succeeded (`5daf6ac` feature commit). Automatic draft PR creation failed with `Post https://api.github.com/graphql: Forbidden` in the cloud environment. No PR number was returned and no PR creation is claimed. Manual draft creation: https://github.com/BlueengelEdgar/Find-face-game/compare/main...feat/v05-crowd-experience?expand=1 — select **Create draft pull request** and use `docs/V05-PR.md`. Do not merge while the capacity decision is pending.

## Final automated results

- `npm ci`: passed.
- `npm test`: 20/20 passed, including a 150-ID/30-batch model-only completion test.
- `npm run build`: passed; portable HTML embedding/parsing verified. Existing Phaser chunk-size warning remains.
- `npm run test:browser`: passed. Four intro/tutorial viewports; then 370 correct touch selections across five complete tutorial + V0.4 baseline second-level runs, with 64 batch transitions. Includes supported/unsupported/throwing vibration, rapid errors, hold/drag, correct/found input, alpha-transparent overlap, countdown/transition locks, badges, responsive bounds, retry reset, fake ranking, and zero-network offline HTML. See `v05-browser-results.json`.
- Tutorial worst upper-head visibility: 90.96% / 98.64% / 91.94% / 91.45% across the four viewports; all central facial-feature masks >=95%.
- Capacity diagnostic: completed as a **failed 150-person layout experiment**, not a passing acceptance test.
- ZIP helper: CRC and embedded HTML equality passed.
- `git diff --check`: passed.

Earlier exploratory runs exposed tutorial edge/chin clipping (fixed in coordinates) and an overly strict wall-time-independent assertion on repeated found taps (corrected to subtract actual elapsed time). The final full run passed; no test threshold for head visibility or density was weakened.
