# CrazyGames submission preparation

**Status: READY FOR MANUAL QA.** No upload, agreement acceptance, publication, acceptance or earnings claim. Use the Basic ZIP only. This is a local review candidate; live portal preview and physical-device review remain outstanding.

## English metadata

**Title:** Street Memory — working title, NEEDS HUMAN REVIEW (see `NAME_REVIEW.md`).

**Short description:** A tiny town with roads that remember. Send cars in the right order and bring everyone home.

**Long description:** Every car leaves a little impression. In Street Memory, the cars follow the town's current road signs, then replace those signs with the letters on their roofs. Your job is to find the right order. Guide a colourful fleet through 48 carefully selected puzzles across six quiet neighbourhoods, or take on a new shared Daily delivery. Preview a route, undo a trip or ask for a gentle hint. There are no timers or lives: just little roads, changing directions and the pleasure of bringing everyone home.

**How to play:** Click or tap a car to send it. It follows the current L or R sign at each junction, then changes that sign to the letter on its roof. Match the car's colour and symbol with its home. Deliver every car. Undo reverses a trip; Restart restores the street. Hint highlights one car that leads to a full solution. Turn on Preview, select a car and press Send to confirm its route. Keyboard: 1–6 cars, Z Undo, R confirm Restart, Escape Pause; Tab and Enter/Space activate buttons.

**Genre:** Puzzle / Logic. Suggested tags: brain, cars, strategy, relaxing, single player. English. Intended audience 13+; formal rating NEEDS HUMAN REVIEW. No violence, purchases, personal identifiers or tracking.

**Orientation recommendation:** landscape for initial submission. Portrait layout is available and Chromium-emulated at 360×640, but physical-phone readability must be reviewed before claiming portrait/mobile support. No in-game rotation/fullscreen lock is implemented.

## Supported/tested matrix

| Environment                                                 | Evidence/status                                           |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| Linux installed Google Chrome, headless Chromium automation | PASS: gameplay, production builds and responsive controls |
| Mouse, keyboard                                             | PASS: automated actual controls, native focus             |
| Chromium mobile/touch emulation                             | PASS: single-tap send, Preview/Send, layout               |
| Edge / Windows                                              | NEEDS HUMAN REVIEW                                        |
| Safari / macOS                                              | NEEDS HUMAN REVIEW                                        |
| iOS Safari / Android Chrome physical phones                 | NEEDS HUMAN REVIEW                                        |
| 4 GB Chromebook and CrazyGames App                          | NEEDS HUMAN REVIEW                                        |
| Live CrazyGames preview iframe / real SDK                   | NEEDS HUMAN REVIEW; mocks alone do not establish this     |

Tested viewports: 907×510, 821×462, 800×450, 360×640, 1920×1080, 1077×606, 1216×684, 1366×768 and 1080×607. Screenshots for streets 1/3/15/30/48 at two sizes are in `release/metadata/screenshots/`.

## Files and platform configuration

Upload `release/street-memory-crazygames-basic.zip`. Its root contains `index.html` and relative `assets/`. Final Basic ZIP: **364,923 bytes**, local bundle **1,595,545 bytes**, **6 files**. Exact hashes and per-file sizes: `release/metadata/package-audit.json` (also summarized in QA_REPORT). Initial local game assets equal the entire compact bundle; the official remotely hosted SDK is additional and its transfer size is not included in that local figure. Covers/videos/notices documentation are separate submission materials; runtime notices are bundled.

Basic uses SDK v3 game events/settings, deduplicated start/stop, and safe localStorage. No advertisements, rewarded controls, advertising dependencies, third-party CTA, external portal link, own fullscreen or sitelock. SDK failure is graceful. No network service is needed for Daily. The Basic Progress Save selection should reflect **local saves**, not claim Data Module cloud sync. Confirm the current portal options manually.

`release/crazygames-full/` is a future build, not the Basic upload. It uses SDK Data alone after init and a between-level midgame hook. Full admission, Progress Save toggle, live ad callbacks and migration from existing Basic local data require separate review. Do not switch a published game to Full by replacing the ZIP without a save migration decision. See [official Data guidance](https://docs.crazygames.com/sdk/data/).

## Graphics

- `release/covers/landscape.png`: 1920×1080.
- `release/covers/portrait.png`: 800×1200.
- `release/covers/square.png`: 800×800.
- Matching editable SVG masters beside each PNG.
- `release/previews/landscape.mp4`: 1920×1080.
- `release/previews/portrait.mp4`: 1080×1620.

Videos are 18-second silent normal-speed real gameplay captures with a matching cover opening. Use `release/metadata/asset-audit.json` for dimensions, durations, codecs and sizes. Human playback review remains prudent before upload.

## Preflight and manual upload

- [x] Pure core tests, independent randomized reference comparison and campaign replay.
- [x] Startup without mandatory menu; Undo/Restart/Hint/Preview/Next work.
- [x] Standalone and Basic production smoke plus unpacked ZIP smoke.
- [x] Local relative paths and compact game bundle; no source/secret directories in ZIP.
- [x] Original art/audio and bundled third-party runtime notices.
- [x] Three cover formats and two actual-gameplay preview videos exported.
- [ ] Fresh human playtest of campaign variety, onboarding and difficulty.
- [ ] Physical mobile, Safari, Edge and Chromebook checks.
- [ ] Final title/ownership/age-rating decision.
- [ ] Live CrazyGames preview with official SDK settings/game events and local persistence.
- [ ] Human accepts the platform's agreements and selects final supported devices.

1. Open <https://developer.crazygames.com/> as the owner. Create a game draft and choose the HTML5/Basic flow currently offered.
2. Upload the Basic ZIP; choose its root `index.html`. Do not upload source, node_modules, metadata, Full output or the whole repository.
3. Enter the reviewed title, descriptions, controls, tags and actual supported devices/orientation. Select save behaviour consistent with this Basic adapter.
4. Add all three cover PNGs and both MP4s. Inspect their small-card crops and video playback.
5. Use the portal preview at 907×510 and mobile landscape. Check first playable action, signs, sound/mute, Pause, win/Next, Daily and reload persistence; inspect console and network for 404/errors.
6. Resolve the unchecked QA items and any portal validation feedback. Only the owner should accept agreements and submit when satisfied. No automated publication is part of this project.

Requirements were re-read 2026-11-10: [technical](https://docs.crazygames.com/requirements/technical/), [SDK init](https://docs.crazygames.com/sdk/intro/), [game settings/events](https://docs.crazygames.com/sdk/game/), [covers/video](https://docs.crazygames.com/requirements/game-covers/), [ads](https://docs.crazygames.com/sdk/video-ads/). Recheck before submission because platform requirements may change.
