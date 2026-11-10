# QA report — 2026-11-10

**Status: READY FOR MANUAL QA.** The local standalone/Basic candidate is playable and packaged. It has not been uploaded to CrazyGames. Live portal validation, physical devices and independent human playtesting remain unchecked; this report is not platform approval.

## Environment

Linux; Node v22.23.3, npm 10.9.9, Python 3.12.3. Installed Google Chrome **157.0.8103.38**, exercised headlessly through Playwright 1.56.1. Phaser 3.90.0 Canvas, TypeScript strict, Vite 6.4.1, Vitest 3.2.4. Tests and static servers bound only to 127.0.0.1. No native Safari/iOS/Android device was used. Headless touch is emulation, not device certification.

## Actual commands and results

| Command                          | Exit | Result                                                                                                                          |
| -------------------------------- | ---: | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`              |    0 | PASS, strict TypeScript                                                                                                         |
| `npm run lint`                   |    0 | PASS, ESLint                                                                                                                    |
| `npm test`                       |    0 | PASS, **28 tests** across 4 files; includes 320 seeded tree/merging-DAG property cases and independent exhaustive solver oracle |
| `npm run validate:levels`        |    0 | PASS, 48 validated puzzles and saved solution replays, no canonical duplicate labelled mechanics                                |
| `npm run build:standalone`       |    0 | PASS                                                                                                                            |
| `npm run build:crazygames-basic` |    0 | PASS                                                                                                                            |
| `npm run build:crazygames-full`  |    0 | PASS, future adapter only                                                                                                       |
| `npm run package`                |    0 | PASS, root index, extraction and repeated byte-identical ZIP                                                                    |
| `npm run audit:package`          |    0 | PASS, relative paths, file/size budgets, no source/maps/secrets folders, no SDK in standalone                                   |
| `npm run test:e2e`               |    0 | PASS, **16 Chromium scenarios**, 1.8 minutes in final production-inclusive run                                                  |
| `npm run audit:assets`           |    0 | PASS, PNG dimensions/opacity, MP4 size/aspect/duration/silence                                                                  |
| `npm run audit:layout`           |    0 | PASS, 35 topology/entry signatures, zero proper intersections between nonadjacent authored road centrelines                     |
| `npm run assets`                 |    0 | PASS, three original SVG masters exported to PNG                                                                                |
| `npm run capture:preview`        |    0 | PASS, two actual normal-speed gameplay recordings and silent MP4 exports                                                        |
| `npm run review:levels`          |    0 | PASS, images of all 48 maps exported for inspection                                                                             |

Machine command records: `release/metadata/qa-commands.json`; stdout/stderr: `release/metadata/logs/`. `npm run verify` is the repeatable check/build/package/E2E pipeline. The final full pipeline includes explicit Data-module-disabled and long-running-ad cases. After the ad watchdog fix, all builds, audits and browser scenarios were rerun against the resulting package.

## Logic and content coverage

- Exact RED → BLUE → GREEN event trace, old-sign read before imprint write, both switches updated, final L/L and victory.
- BLUE first reaches the wrong home; failed memory persists; Undo restores switches, available cars and move snapshot. Successful Undo, Restart, strict unavailable phases/IDs and maxSteps protection checked.
- Malformed JSON, invalid destinations/IDs/edges, duplicate IDs, missing memory, identical exits, terminal outgoing edges, unreachable objects and cyclic graphs rejected.
- Pure simulation does not mutate level/state. Solver counts and example solutions agree with an independent slow permutation implementation for seeds 1–240 and 301–380. Failing assertions include the seed; no unresolved failing seed remains.
- Every recorded campaign order reaches `won`; every selected switch changes along that order and no two cars within a puzzle share the same entry/destination/imprint role. Catalogue identity normalization rejects renaming/recolouring/list-reordering as artificial novelty.
- 56 Daily/fallback cases sampled in unit tests (28 days × normal/forced fallback), UTC date rollover and repeatable seed tested. Generator attempts bounded; fallback is already solver-validated.
- Save round-trip, v1 migration/defaults, malformed storage, out-of-range fields and unavailable storage checked. Campaign/Daily and best stars stored separately.
- SDK init success/failure, deduplicated gameplay events, Basic no-ad behaviour, Full adFinished/adError/adsDisabled/throw/watchdog/late callback, long real ad remains muted until its completion callback, Data present/absent, no parallel local saves in cloud mode, and forced audio mute priority checked with mocks.

## Browser coverage

Actual controls were used to complete the first 10 streets, the reference puzzle and the final six-car street. E2E covers first action without a menu, sign change, win/Next, wrong home/Undo/correct retry, Restart after two trips, input during animation, preview purity, touch Preview/Send, Hint, honest dead-end advice, keyboard, Pause/Resume during a trip, settings/sound controls, saved progress reload, corrupted save, separate Daily completion, 30 Restarts and 20 Undo cycles, and resize during a trip.

Checked layouts: 907×510, 821×462, 800×450, 360×640, 1920×1080, 1077×606, 1216×684, 1366×768, 1080×607. Toolbar controls have ≥44×44 CSS-pixel bounds, stay within the viewport, and no horizontal overflow was observed. Production standalone and Basic mocks win through real controls; the unpacked upload archive also starts and wins. Standalone makes no SDK/external requests; production dev hooks are absent. No unexpected console exceptions, 404s or unhandled errors were observed in the production smoke and responsive checks. The intentional mocked SDK rejection remains playable.

Screenshots: `release/metadata/screenshots/street-{1,3,15,30,48}-{907x510,360x640}.png`. All 48 board captures and three review sheets are in `release/metadata/review/` and `review-sheet-*.jpg`. The development agent inspected these images, the full final street at both sizes, all three covers, the video opening frame and gameplay contact sheet. This is visual inspection of captured output, not a claimed manual Safari/mobile playtest.

## Release measurements

- Basic ZIP: **364,923 bytes** (356.37 KiB).
- Basic local bundle: **1,595,545 bytes**, **6 files**; this conservative initial budget includes the notices file. The remote official SDK is additional and not included in this local figure.
- Standalone: **1,591,994 bytes**, **5 files**.
- Future Full: **1,595,593 bytes**, **6 files**.
- ZIP SHA-256: `16ff1d542aa7e9fd2f9d71460d2c1259e800684642349dea317fcd45808bd10c`.
- Covers: opaque PNGs, 1920×1080 / 800×1200 / 800×800; original SVG masters included.
- Videos: H.264/yuv420p, 30 fps, exactly 18 seconds; landscape 1920×1080 **508,116 bytes**, portrait 1080×1620 **472,035 bytes**; **zero audio tracks**. Brief matching-cover opening followed by genuine normal-speed reference gameplay.

Per-file sizes/hashes: `release/metadata/package-audit.json`. Asset details: `release/metadata/asset-audit.json`. No source, node_modules, reports, covers, previews, credentials or temporary captures are inside the upload ZIP.

## Fixed issues and limits

During development the following failed checks were resolved: missing node/npm PATH (used installed nvm Node); sandbox DNS prevented dependency install (authorized package fetch used); first dev-server binding was rejected as too broad (restricted to localhost); tsx CLI IPC was unavailable in the sandbox (Node's tsx import hook used); lint failures corrected; Basic build top-level-await target failure removed by async bootstrap; corrupt-save test setup moved to pre-load injection; SVG intrinsic dimensions and canvas sizing fixed; initial landscape-cover crop corrected. Intermediate failures are not represented as final passes without their fixes and reruns.

**NEEDS HUMAN REVIEW:** live CrazyGames SDK/portal preview, device/browser selection, Safari/iOS audio interruptions, physical touch and safe areas, Edge, low-memory Chromebook performance, subjective pacing/enjoyment, final title/brand/rating decisions and Full migration/cloud/ads. No measured slow-network startup or physical-device FPS/retention claim is made. Dense late street labels deserve particular phone review. See `KNOWN_ISSUES.md`, `DESIGN_REVIEW.md`, `NAME_REVIEW.md` and `CRAZYGAMES_SUBMISSION.md`.

## Audio clarity follow-up

The original effects had low per-note peak gain (0.045) and no enable-confirmation signal. Increased it to 0.14, added an enable chime, explicit speaker/mute icons and current platform-muted labels. At that stage background music was still absent; the new theme is covered below. A real Chromium AnalyserNode test verifies both the enable chime and gameplay output above 0.09 peak and zero output under forced mute after flushing its frame history. The final sampled gameplay peak was 0.1601. This verifies the browser audio graph, not the user's OS mixer, browser tab mute or physical speakers. That earlier update passed 24 unit/property and 15 E2E tests; all three builds and the upload ZIP were refreshed. Previews were re-recorded with the current speaker icon and remain silent. Latest combined log: `release/metadata/logs/audio-fix-verification.log`.

## Background music follow-up

Added an original 84 BPM, eight-bar (22.857-second) background theme, synthesized from soft melody, chord and bass voices in `src/game/Music.ts`. Music begins only after a trusted click and obeys master Sound, platform mute, dialogs and visibility pause. Its separate Background music checkbox persists in the existing save schema; old saves default to music enabled while preserving their master sound choice. The scheduler uses the AudioContext clock with bounded lookahead, skips stale notes and owns one timer. Voices disconnect on completion; music position continues across pauses and level changes.

Four new unit tests cover composition bounds/timing, scheduler idempotence/stall handling/50 pause cycles, suspended-context gating and backward-compatible preference persistence. A real Chromium audio-graph test confirms nonzero music without sending a car, silence in Settings/under forced mute, successful resume, bounded live voices, and persisted Music off after reload. The isolated effect/chime audio test also still passes. Final full verification: **28 unit/property tests, 16 E2E scenarios**, all 12 pipeline commands exit 0. Log: `release/metadata/logs/music-verification.log`. The upload ZIP and all three builds were regenerated. Existing preview videos intentionally stay silent. Subjective listening on physical speakers remains a human check.
