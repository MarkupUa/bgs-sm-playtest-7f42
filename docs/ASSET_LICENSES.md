# Asset provenance and notices

## Original project assets

All cars, houses, junction signs, branch icon, trees, scenery, UI styling and cover compositions were created as vector/code assets for this project during this implementation. No purchased packs, stock illustrations, competitor screenshots, real vehicle marks, generative raster assets or downloaded fonts are used. These original project assets have no external attribution requirement; the repository owner should choose the source/art distribution licence before any public source release. No third party licence is being invented for original work.

| Asset                               | Source                                             | Provenance / terms                                                                                                                       |
| ----------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Car and home SVG variants           | `src/game/art.ts`                                  | Created for project; generated from colour/symbol/imprint parameters                                                                     |
| Roads, signs, dock, trees, town map | `src/game/BoardScene.ts`                           | Created for project with Phaser drawing primitives                                                                                       |
| App icon                            | `public/assets/icon.svg`                           | Created for project; branching road glyph                                                                                                |
| UI                                  | `src/style.css`, `src/main.ts`                     | Created for project; native CSS/HTML controls                                                                                            |
| Three cover masters and PNG exports | `scripts/export-assets.mjs`, `release/covers/`     | Created for project, original compositions, not gameplay screenshots                                                                     |
| Five sound families                 | `src/game/Audio.ts`                                | Created for project; synthesized Web Audio sine tones. No sampled audio/music                                                            |
| Preview MP4 files                   | `scripts/capture-preview.mjs`, `release/previews/` | Captured from this game's actual normal-speed playthrough, silent; H.264 encoding via installed FFmpeg                                   |
| Review/E2E screenshots              | `release/metadata/`                                | Captured from this game in installed Chromium                                                                                            |
| Typography and symbols              | Browser system font stack                          | System fonts are referenced, not copied/distributed. Unicode geometric symbols/letters are text; browser/platform glyph rendering varies |

Background music: `src/game/Music.ts` contains an original composition created for this project: 64 eighth-note steps, 84 BPM, soft sine melody/pads and triangle bass. It uses no sampled audio, commercial track, external stream or third-party musical arrangement. The composition and synthesis code have the same original-project provenance as the other assets above.

## Runtime libraries

Phaser **3.90.0** is MIT licensed, Copyright Richard Davey / Phaser Studio Inc. Its bundled dependency eventemitter3 is MIT licensed, Copyright Arnout Kazemier. Exact upstream notices are copied from installed package files into `public/assets/THIRD_PARTY_NOTICES.txt` and included in every release, along with embedded Phaser distribution notices (including Earcut/Mapbox ISC and Vladimir Agafonkin BSD). This is the authoritative bundled notice text.

Phaser source: <https://github.com/phaserjs/phaser/tree/v3.90.0>. EventEmitter3 source: <https://github.com/primus/eventemitter3>. The files used for notices are local `node_modules/phaser/LICENSE.md` and `node_modules/eventemitter3/LICENSE`.

Vite, TypeScript, Vitest, Playwright, ESLint, tsx and Prettier are development/build dependencies, not separately shipped tools in the game package. Their versions and package integrity values are fixed in `package-lock.json`; dependency licences remain in installed packages. Chromium/FFmpeg are environment tools, not distributed within the game ZIP. The CrazyGames SDK is loaded from the official platform endpoint in CrazyGames builds only and remains subject to CrazyGames' terms; it is not relicensed or vendored here.

The project does not grant rights to CrazyGames' brand or promise trademark clearance of the working title. See `NAME_REVIEW.md` before submission. No agreement has been accepted on behalf of the owner.
