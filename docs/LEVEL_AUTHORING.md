# Level authoring

Edit `src/levels/campaign.json` in a local checkout. Additions require IDs stable across releases. Never silently change a published puzzle under the same ID. Generation is a candidate-authoring tool, not an automatic content-release process.

A level contains `id`, `title`, `district` (0–5), `seed`, `nodes`, `cars`, `solution`, and optionally a short English tutorial `note`. Coordinates are nominal in a 920×460 board, mapped responsively at render time.

```json
{
  "id": "sm-049",
  "title": "An example",
  "district": 0,
  "seed": 49,
  "nodes": [
    { "id": "E", "kind": "entry", "next": "S", "x": 460, "y": 35 },
    { "id": "S", "kind": "switch", "L": "H0", "R": "H1", "initial": "L", "x": 460, "y": 180 },
    { "id": "H0", "kind": "home", "color": "#e98873", "symbol": "●", "x": 260, "y": 385 },
    { "id": "H1", "kind": "home", "color": "#75b6cd", "symbol": "◆", "x": 660, "y": 385 }
  ],
  "cars": [
    { "id": "coral", "entryId": "E", "destinationId": "H0", "imprint": "R" },
    { "id": "blue", "entryId": "E", "destinationId": "H1", "imprint": "L" }
  ],
  "solution": ["coral", "blue"]
}
```

The TypeScript discriminated unions in `src/core/model.ts` are the authoritative schema. Runtime validation rejects duplicate IDs, invalid links/imprints/memory, invalid destinations, unreachable objects, identical L/R exits, invalid coordinates and cycles. Homes have no outgoing edges by type; entries have one; switches have two. Keep at most six cars. Respect the explicit exit labels; L/R are port names, not instructions to steer a car manually. Draw noncrossing roads and leave room for the enlarged sign badges.

Run `npm run validate:levels` for shape validation, duplicate fingerprint checks, exact solve counts and replay of every recorded solution. It writes `release/metadata/level-audit.json`. For the full solution and live signs, open `npm run dev` with `?debug` and use the development console `streetMemory.load(14)` (zero-based), `streetMemory.solve()` and `streetMemory.state()`. The helpers are absent in production. `npm run review:levels` captures all maps; open the image sheets or individual PNGs. Inspect at both 907×510 and 360×640, and play through the controls rather than trusting only the solver.

`npm run generate:levels` deterministically exports 48 candidates from fixed seeds. It makes no network request and has a hard 16,000-attempt limit per slot. Review candidates before accepting them. Filtering is conservative: at least one wrong permutation after the introductory puzzle, no identical car roles, at least min(3, car count) target homes, every switch changes in the saved solution, and all nodes are reachable. Reject duplicate fingerprints. The solver's count is not a universal quality score; alternative solutions are useful and are retained.

Difficulty report lists car/switch counts, solution count, viable first moves, wrong-permutation ratio and explored solver states. A low solution count is not proof of fun. The selected catalogue adds downstream entries, deeper branches and different initial memories as complexity grows. New mechanics are deliberately avoided so the order-writing rule remains clear.

Daily uses UTC ISO date, seed `street-memory:daily:v1:YYYY-MM-DD`, stable PRNG/shuffle, 32 attempts and an audited fixed fallback. Bump the Daily generator version if its algorithm changes after publication. Existing daily results are keyed independently from campaign progress.
