# GitHub Pages public playtest

Target repository: <https://github.com/MarkupUa/bgs-sm-playtest-7f42>. Branch: `main`.

Public URL: <https://markupua.github.io/bgs-sm-playtest-7f42/>.

This deploys the existing game. Simulation, solver, campaign JSON, Daily seeds, save key/schema, art and music are unchanged. Pages mode selects StandaloneAdapter; the CrazyGames integration remains available as separate source/build modes and is absent from `dist`.

## Build and paths

`npm run build` runs Vite's `github-pages` mode with `base: '/bgs-sm-playtest-7f42/'` and writes `dist/`. Other standalone/CrazyGames modes retain relative paths and their existing `release/` directories. The favicon uses Vite BASE_URL substitution and the brand icon uses `import.meta.env.BASE_URL`. Town textures/audio are generated in code; the campaign is bundled. There is no client-side path router, so refreshing the project root is supported without a custom 404 workaround.

The page title is `Street Memory — A Cozy Logic Puzzle`, with English description, favicon and viewport. Pages mode adds `noindex, nofollow, noarchive` for this temporary test. The URL is public; noindex is not access control. No custom domain is configured.

## CI and automatic deployment

`.github/workflows/deploy.yml` runs on pushes to main and `workflow_dispatch`. It uses the official actions/checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5 and deploy-pages v5 major versions, checked against upstream releases on 2026-11-10. Node 22 matches the existing project's engine requirement. No dependency was added.

Build job: npm ci → typecheck → lint → all Vitest tests → validate all campaign solutions → Vite build → dist audit → install Playwright Chromium → production Pages browser tests → configure Pages → upload only dist.

Deploy job depends on the successful build and uses environment `github-pages` with the deploy action's URL. Permissions are contents:read, pages:write and id-token:write. One deployment is queued at a time; in-progress deployments are not cancelled. No token or private key is committed; CI uses GitHub's provided scoped token/OIDC.

For a manual retry, open repository Actions, choose the workflow, select Run workflow/main. If Pages is not enabled, Settings → Pages → Build and deployment → Source → GitHub Actions. The deployment report must distinguish an actual successful remote run from a local build alone.

## Local and public browser verification

```sh
npm run build
npm run audit:pages
npm run test:pages
PAGES_URL=https://markupua.github.io/bgs-sm-playtest-7f42/ npm run test:pages
```

`playwright.pages.config.ts` starts local Vite preview only when PAGES_URL is absent. The same suite can verify the actual published site. It checks resource loads/no external SDK/ads; Campaign, wrong home/Undo, Hint, Preview/Send, Restart after two deliveries, Pause, Sound and Next; completion/levels/stars; storage across close/reopen/F5; UTC Daily across UTC+14 and UTC−8; mouse/touch; and the final street at 1920×1080, 1366×768, 907×510, 768×1024, 390×844 and 375×667. Screenshots go to ignored test-results. Physical-device Safari/iOS/Android checks remain manual.

## Saves and updates

The key `street-memory:save:v2` and its parsing/migration remain unchanged. Normal pushes replace static files, not localStorage. Tests verify closing and reopening a tab in the same browser context. Saves belong to the site's origin and browser profile; localhost progress is not automatically shared with github.io. Audio requires a gesture, respects the master Sound toggle and has an independently saved Music preference. Daily still uses the existing UTC date and deterministic seed implementation.

## Workspace and Git copy

The original workspace has a protected, read-only placeholder `.git` directory without a repository. It is not altered. An ordinary Git working copy is prepared in `.deployment/repository/` from an explicit allowlist of current source/config/test/docs files. The copy has origin pointing to the specified repository and branch main. It excludes node_modules, local release bundles/archives, reports, credentials, tool directories and the private task brief. The original game remains in place. For future edits, work in that Git copy or clone the published repository into a normal writable folder, then push main; the workflow handles publication.
