# V0.6 limited-time challenge — review draft

Base: main `1b361f4` (PR #6 merged V0.5). Branch `feat/v06-time-challenge`. This is a review draft: time challenge/effects and safer natural layouts are implemented; **the requested 180/200-person formal second level is not accepted or implemented**. No merge, publication, Pages permission or repository visibility change.

## Time rules and state

One `Round` owns remaining time, rewards, penalties, found IDs, batch lock, pauses and terminal status. Each new level starts paused at exactly 30,000 ms. All of the instruction/3/2/1/GO animation finishes before `start()` releases the opening lock. Every valid new correct match immediately adds 3,000 ms without a cap. Each separate valid wrong touch immediately subtracts 2,000 ms. Found/blank/locked input has no additional effect.

`remaining = max(0, 30000 + rewards - penalties - activeElapsed)`. Active elapsed excludes opening, batch, hidden-tab and unsupported-viewport pauses. The HUD reads one remaining-time snapshot for number, bar width, phase and warning: green >20s, yellow >10s through 20s, red >0s through 10s, expired at zero. Width clamps at 100%, not the actual number. Countdown display rounds upward to tenths, so positive sub-tenth time does not prematurely display zero. Color transition is 150 ms; the red warning is a gentle 1.2-second shadow pulse. Recovery above 10s removes it immediately; upward phase crossings produce green light rings.

A deadline check runs both before a pick and in the HUD ticker (50 ms). Expired time cannot be rescued by a late click. A valid last match immediately records a win and freezes time before its 200 ms feedback/celebration handoff, so a later tick cannot turn it into a loss. Natural expiry and a wrong click consuming the last time both lose. Failure cancels pending match, flight, impact, star and shake effects; a generation token prevents canceled flight completions from producing stale impacts after a failure/retry.

Failure: TIME’S UP! / TRY AGAIN!, found/total and only RETRY. Retry restarts the current level, including the opening and fresh 30 seconds. Victory keeps the existing English celebration; first level only NEXT LEVEL; second shows remaining time, active completion time and clearly simulated rankings.

## Effects and input

- Preserve the linked 200 ms / 1.12× wall/target pulse and completion checks. The wall pulse copy is noninteractive; original alpha hit regions stay unchanged.
- Each matching target emits 16 gold/white/accent stars, 20 for a batch/level's final match. They rotate/scale/fade over 520–590 ms in a fixed, pointer-events:none viewport layer. They can cross card and target-panel boundaries without ancestor clipping; only the viewport clips them.
- Independent green +3s / red −2s text nodes fly along sampled curved paths from the face toward the time bar over 440 ms. Arrival creates separate green/red impact rings. These are cosmetic: they never apply or defer time changes.
- Batch handoff remains ~700 ms including the last match's pulse (200+180+280+40 maximum stagger), with the existing input/time lock. Flight arrival and stars do not add waiting time.
- Preserve one-down-per-gesture, no drag repetition, blank/found exclusions and safe absent/throwing vibration behavior. No extra menu, server, login or database.

## Natural layouts and actual density limits

The latest main did **not** contain a 150-person playable second level. It had validated 75-person regular and 45-person compact layouts, plus 150 independent art resources. No population was silently reduced in V0.6.

Those 75/45 layouts were re-seeded directly in 2D with deterministic best-candidate sampling (seed 6006), not row/grid jitter, then corrected against real alpha masks. Heights, depths and sizes vary. On the resulting candidate, portraits were enlarged uniformly by 2.5%; all stay above the existing V0.5 minimum portrait-size bounds. No character or background pixels were changed. Local JSON freezes positions for reproducible play.

Actual Chromium/Phaser candidate audits:

| Layout | Actual wall | Count | Worst head visibility | Worst central features | Stable face witnesses | Foreground occupancy |
|---|---:|---:|---:|---:|---:|---:|
| Regular | 370×592 | 75 | 87.48% | 96.91% | 75/75 | 91.22% |
| Compact | 300×373 | 45 | 88.12% | 96.93% | 45/45 | 81.80% |

The whole upper-head mask is source alpha>=96 through face anchor+0.18; central facial features have a separate stricter test. This is a reproducible proxy including face/hair/hats, **not hand-labeled semantic ground truth**. Automated geometry checks and touch witnesses do not replace human recognition/visual review.

### 150/180/200 experiments — not accepted levels

All 150 existing unique portraits were rendered in a separate deterministic non-grid diagnostic at the V0.5 minimum size. On the actual 370×592 wall, occupancy is 94.40%, but **145 heads fall below 85% visibility**, minimum visibility is 22.11%, and **20 characters lack a stable central-face touch witness**. This is a failed diagnostic, not a playable accepted level. Its bottom targets are the boot tutorial's cards, not a 150-person completion test.

The resource inventory is exactly 150 unique local WebPs. There are no approved character-151…200 files. We did **not** repeat/recolor portraits as extra identities or pretend to have run real 180/200-person art/click tests.

| Requested count | Missing unique art | Optimistic required visible head area / wall (370×592) | Status |
|---|---:|---:|---|
| 150 | 0 | 138.0% | Real-art failed diagnostic |
| 180 | 30 | 155.9% | Area estimate only; actual extra art absent |
| 200 | 50 | 167.8% | Area estimate only; actual extra art absent |

These are necessary-area estimates at the minimum V0.5 portrait width (64.75 px), before body/gap allowances. For missing art, the **smallest** existing head mask is used as an optimistic estimate; it is not rendered as a new person. A smaller mask ending at face anchor+0.06 still requires ~112.2%, 126.4%, 135.9%. These masks and assumptions support a capacity conflict under this measurement standard; a failed sample alone is not proof about every possible hand-authored design. See `v06-capacity.json`, `v06-150-measurement.json` and the failed screenshot.

Need human decision before the formal larger level: allow separate areas (e.g. 180=4×45 or 200=5×40, subject to actual asset/geometry acceptance), or authorize smaller portraits and renewed touch/visual tests, or retain the currently validated population while reconsidering the target. None was selected silently. New art, when approved, should be transparent local 288×360 WebPs in the existing muted comic style, unique IDs 150–199 and files character-151.webp…200.webp; per-character face anchors/recognition masks should accompany the manifest. Matching targets must use the exact same files. Adding only recolors is not acceptable.

### Reproduction

`npm run test:capacity` regenerates the 150 diagnostic and capacity estimate (requires Python Pillow/NumPy; not a runtime/Pages dependency). For maintenance of 75/45 candidates:

```sh
node scripts/seed-v06-layout.mjs
python scripts/fit-v06.py regular
python scripts/fit-v06.py regular --polish
python scripts/fit-v06.py compact
```

These write /tmp candidate data, never source layouts automatically. Final committed data includes a 1.025 size multiplier after fitting. `tests/v06-layout-preview.js` measures /tmp candidates. Only after audit should coordinates replace `src/layout-regular.json` / `src/layout-compact.json`; the committed JSON itself is the runtime source of truth.

## Tests and real-device limits

`npm ci`, `npm test` (23 tests), production build and browser verification use the managed workspace. Browser boundary tests use a test-only monotonic performance offset, leaving native RAF/Web Animation clocks intact; production has no clock/debug controls. The other responsive cases run with the normal clock. The HUD assertion reads number and fill in one DOM snapshot to avoid false mismatches while time is genuinely decreasing.

Browser cases cover 390×844, 320×568, 768×1024, 1366×768, plus completely offline self-contained HTML at 1440×1000. Real canvas alpha masks and actual touch events are used. Success in those viewports does **not** establish true iPhone Safari support. Physical Safari toolbar/safe-area behavior, finger accuracy, hardware vibration, actual-device FPS/memory, reduced-motion experience and human art approval remain untested. An unsupported short/aspect-changing viewport retains the existing pause behavior instead of silently changing population or squeezing faces.

The existing Phaser JS chunk remains ~1.51 MB minified and triggers Vite's >500 kB warning; build still succeeds. Existing textures are reused for pulses; no new portrait textures were introduced. The second-level loader prepares at most the 75 configured identities (plus cached tutorial images), not 180/200 textures. Full 150-source RGBA inventory would be ~59.3 MiB decoded before background/GPU overhead; real device memory measurements remain pending.

## Screenshots and files

- `docs/screenshots/v06-reward-stars.jpg`: actual reward flight/target stars.
- `docs/screenshots/v06-penalty.jpg`: actual wrong-click feedback.
- `docs/screenshots/v06-failure.jpg`: actual timeout and RETRY.
- `docs/screenshots/v06-390-level1.jpg`, `v06-390-level2.jpg`: actual playable levels.
- `docs/screenshots/v06-150-diagnostic.jpg`: failed 150-person diagnostic (not accepted gameplay).
- `src/model.js`, `src/time-rules.js`: authoritative countdown, reward/penalty, terminal and threshold rules.
- `src/main.js`, `src/feedback-effects.js`, `src/scene.js`, `src/style.css`, `index.html`: HUD, effects, failure/retry, existing hit logic and input.
- `src/layout-regular.json`, `src/layout-compact.json`: new natural fixed layouts; existing art unchanged.
- `tests/model.test.js`, `tests/v06-browser.js`: rule/asset/geometry/actual-touch regression.
- `scripts/seed-v06-*.mjs`, `scripts/fit-v06.py`, `scripts/measure-v06-capacity.py`, `tests/v06-*-preview.js`: nonproduction diagnostic/maintenance tools.
- `README.md`, package/lockfile and portable-build/ZIP helpers: V0.6 commands and review artifacts.

## Deployment and review

Vite base remains `/Find-face-game/`; `.github/workflows/deploy-pages.yml` unchanged. Main is not modified. Existing Pages stays on the merged version until human approval/merge and the existing workflow succeeds. Do not describe this draft as a completed 180/200-person release. Local review: `npm ci && npm run dev`; portable output `dist/find-crowd-v06.html` / ZIP is a review convenience, not a published website.

## Final results

- `npm ci`: passed.
- `npm test`: 23/23 passed.
- `npm run build`: passed; portable HTML embed equality/JS parsing passed; existing Phaser chunk warning remains.
- Full `tests/v06-browser.js`: passed five complete level pairs (370 correct selections, 64 batch transitions), including the four responsive viewports and zero-network offline HTML. See `v06-browser-results.json`.
- `node tests/v06-browser.js --input-only`: passed an additional short-phone pair (50 correct selections, eight transitions) with a single held/dragged touch costing exactly 2 seconds, blank-to-face drag free, two quick wrong touches costing exactly 4 seconds, and absent/throwing vibration APIs. See `v06-input-results.json`. No page errors.
- Browser deadline/recovery cases passed red→yellow→green→red, natural failure, wrong-click failure while stars/flights remain active, effect cancellation, current-level retry reset and GO-end time lock.
- Real-mask audits pass >=85% upper-head visibility / >=95% central feature visibility for all characters in all tested playable layouts; actual touches complete every configured identity. This does not constitute a passing 150/180/200-person layout test.
- ZIP CRC/HTML equality and `git diff --check`: passed.
- Existing character/background pixels, Vite base and Pages workflow: unchanged.

Exploratory checks found a sub-millisecond pre-opening elapsed-time leak (fixed by initializing the opening pause at the exact start timestamp), one natural-layout edge occlusion (fixed before adoption), and non-atomic test reads comparing different countdown instants (replaced by a single HUD snapshot). Early global-clock browser experiments were replaced by a monotonic test-only performance offset to leave native Phaser/WAAPI frame timing intact. No visibility threshold was weakened to pass the final runs.

Git status: implementation commit `f361db0` successfully pushed to `feat/v06-time-challenge`. Automatic draft PR creation failed with `Post https://api.github.com/graphql: Forbidden`; no PR creation/number is claimed. The error does not distinguish cloud network policy from API authorization, so no repository visibility, credential or Pages permission change was attempted. Manual review: open https://github.com/BlueengelEdgar/Find-face-game/compare/main...feat/v06-time-challenge?expand=1, select Create draft pull request, and use `docs/V06-PR.md`. Human density/visual acceptance remains required before merging this draft.
