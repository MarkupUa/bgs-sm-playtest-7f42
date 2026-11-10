# Known issues and unverified scope

Status: **READY FOR MANUAL QA**. Locally playable candidate; no publication or platform acceptance claimed.

- Live CrazyGames Developer Portal preview, real SDK hosting context, content/editorial approval and platform traffic metrics have not been tested. SDK contracts are checked with mocks and current documentation.
- Safari/macOS, Safari/iOS, Edge, physical Android devices, CrazyGames App safe areas and 4 GB Chromebook performance need human/device review. Chromium touch emulation is not a physical mobile test.
- 48 levels are solver-validated and their map layouts inspected by the development agent. Independent human playtesting, subjective pacing and enjoyment are unverified. The early streets intentionally reuse the two-sign grammar; check for repetition with fresh players.
- Some dense late maps have compact port labels at 800×450/360×640. Fleet buttons remain ≥44px. Prefer landscape until human phone testing confirms portrait readability, including colour/symbol discrimination.
- Saves store completed progress and settings, not an unfinished trip. Reloading restarts the current street. When browser storage is blocked, progress is session-only. No cloud persistence claim is made for Basic.
- Full is a prepared future adapter, not a release approval. Data toggle, live ads, migration from existing Basic saves, cloud guest/login behaviour and platform mute require live portal tests before using it. No rewarded functionality exists.
- Brand/name clearance is pending; similar “Main Street Memory” and other “Street Memory” usages were found. See `NAME_REVIEW.md`.
- Product copy is English only. Unsupported SDK locales use English. The map is not a complete screen-reader game; controls have accessible labels and keyboard support, but road reasoning relies on the visible map.
- No on-device load-time/FPS guarantee is inferred from localhost/headless performance. No D1/D7/retention or monetization numbers are asserted.

Fixed during QA: SVG intrinsic dimensions causing clipped homes; stale Phaser auto-parent sizing after layout changes; mixed ESM top-level await incompatibility in Basic build; corrupt-save test setup overwriting itself on pagehide. Regression tests and final screenshots cover the resulting behaviour.
