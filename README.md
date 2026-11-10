# Street Memory

A tiny town. Roads with a memory. A playable puzzle campaign with an independent GitHub Pages public playtest. **Not published on CrazyGames.** See [QA report](docs/QA_REPORT.md) and [submission checklist](docs/CRAZYGAMES_SUBMISSION.md) for verified scope and outstanding device/platform checks.

## Public playtest and deployment

[Play Street Memory](https://markupua.github.io/bgs-sm-playtest-7f42/) · [Repository](https://github.com/MarkupUa/bgs-sm-playtest-7f42) · [Deployment details](docs/GITHUB_PAGES.md)

Built with strict TypeScript, Phaser 3, Vite, Vitest, Playwright and original vector/Web Audio assets. The Pages deployment is a static standalone game with no CrazyGames SDK, ads, backend, accounts or analytics. It uses the current 48-level campaign unchanged. The temporary test page requests `noindex, nofollow`.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run audit:pages
npm run preview:pages
npm run test:pages
```

The Pages production build is `dist/`, with base `/bgs-sm-playtest-7f42/`. Preview opens at `http://127.0.0.1:4180/bgs-sm-playtest-7f42/`. Browser tests use installed Chrome locally (`CHROME_PATH` override); CI installs the Playwright Chromium build. To check the published game, run `PAGES_URL=https://markupua.github.io/bgs-sm-playtest-7f42/ npm run test:pages`.

Every push to `main` runs `.github/workflows/deploy.yml`: locked `npm ci`, typecheck/lint/unit tests, campaign validation, production build, dist audit and browser tests; only then the official Pages Actions upload `dist` and deploy. To repeat manually: **Actions → Deploy Street Memory to GitHub Pages → Run workflow → main**. A failed check prevents deployment. Pages Source must be **GitHub Actions**.

Build output, local release ZIP/video/screenshot assets, node_modules, private tool directories and environment files are excluded from Git. Local generated release materials can be recreated with the commands below. Physical Safari/iOS/Android and subjective balance still need human playtesting; browser emulation is not a device guarantee.

## Run

Node **22.12+**, npm 10+, Python 3 for ZIP packaging/static release testing. No account, backend, API keys or paid assets.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. The first street is already playable. Click/tap any fleet car to dispatch it. A car follows each sign's **old** L/R exit, then replaces the sign with its own roof letter. Deliver every car to the home with its matching symbol and colour. You choose the order; the cars choose their routes.

Undo restores the previous trip, including all signs. Restart resets the street. Hint selects a car that begins a complete solution. Preview shows only the selected car's current route, without changing memory; in Preview mode, press Send to dispatch it. No timers, lives, purchases, advertisements in Basic, or tracking.

Mouse hover previews routes. Touch normally dispatches with one tap. Tab/Enter/Space activate controls; 1–6 send the numbered car; Z undoes; R asks before restarting; Escape pauses/resumes. System modifier shortcuts are ignored by the game. Settings include master sound, separate Background music, fast journeys and reduced motion. Sound starts only after a gesture and platform mute always wins. The original 84 BPM background theme loops softly; uncheck Background music in Settings to keep effects alone.

## Check and build

```sh
npm run typecheck
npm run lint
npm test
npm run validate:levels
npm run build:standalone
npm run build:crazygames-basic
npm run build:crazygames-full
npm run package
npm run audit:package
npm run audit:assets
npm run audit:layout
npm run test:e2e
```

`npm run verify` runs these checks and writes exact command/exit-code logs in `release/metadata/`. Asset checks require Python Pillow and FFmpeg/ffprobe.

E2E automatically starts localhost-only Vite and Python servers. It needs all three builds and `npm run package` first. Uses installed `/usr/bin/google-chrome`; override with `CHROME_PATH=/path/to/chrome`. Tests use Chromium, not a simulated DOM. Screenshots go to `release/metadata/screenshots/`, HTML test report to `playwright-report/`. Browser invocation may require execution permission in restricted environments.

`npm run preview` serves the most recently built standalone Vite output; an unambiguous alternative:

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory release/standalone
```

Upload **contents** of a release directory to any static host; URLs are relative, so subdirectories work. ES modules require HTTP(S): opening `index.html` using `file://` is not supported. Standalone makes no external requests and works without internet once served locally. CrazyGames Basic loads only its official SDK externally; loading/init failure does not stop the game.

## Deliverables

- `release/standalone/`: independent static game.
- `release/crazygames/`: Basic game, no advertising UI/requests.
- `release/street-memory-crazygames-basic.zip`: deterministic upload archive, index at root.
- `release/crazygames-full/`: future adapter build; **do not submit as Basic**. SDK Data as sole save source and midgame-only ad hooks. Needs Full eligibility and portal validation.
- `release/covers/`: three PNG covers and original SVG masters.
- `release/previews/`: silent real gameplay videos; see recording documentation.
- `release/metadata/`: package hashes, exact sizes, level metrics and screenshots.
- `docs/`: design, architecture, authoring, provenance, QA and submission instructions.

`npm run assets` exports covers using Chromium. `npm run capture:preview` records normal-speed reference gameplay from the running dev server (no debug overlay). Requires Chromium and FFmpeg. `npm run review:levels` captures every map for review. GitHub Pages publishing happens only through the dedicated workflow; these asset commands do not publish anything.

## Levels and saves

48 frozen JSON puzzles in six neighbourhoods. The catalogue is not regenerated at runtime. All except the one-car introduction reject at least one order. The selected solutions change every switch at least once; car roles are distinct, and canonical fingerprints reject duplicate labelled puzzles. Multiple entry points and 1–5 switches create different dependencies. These checks establish correctness and remove obvious filler; they do not replace playtesting for enjoyment.

For JSON authoring, solver CLI and explicit release stability rules see [LEVEL_AUTHORING](docs/LEVEL_AUTHORING.md). `npm run generate:levels` is a developer tool that **overwrites the candidate catalogue**; do not run it casually after release. Review its output, retain IDs for unchanged content, and assign new IDs for changed published puzzles.

Save schema v2 contains best stars, selected campaign street, Daily results and four preferences. Corrupt or unavailable storage does not crash play. Version 1 migrates in memory. Campaign and Daily records are separate. A trip interrupted by reload starts the street fresh; in-progress routes are not saved. No identity, analytics or behavioural telemetry is collected. Three stars: no Hint/Undo; two: one Undo and no Hint; one: other completions. Stars never lock content. Restart does not clear Hint/Undo effort counters; reopening a street begins a new attempt.

Development-only `?debug` shows state/seed and solver output. Development helpers are stripped from production. Player copy is English; other SDK locales fall back to English. Rendering uses Phaser Canvas with ResizeObserver rather than WebGL to keep tiny vector maps stable and avoid context-loss dependencies.
