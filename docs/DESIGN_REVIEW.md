# Candidate selection and visual review

Development-agent review, 2026-11-10. This is not independent human audience testing.

Three explicit onboarding puzzles are followed by 45 selected deterministic candidates. Final candidate search examined 341 seeds before filling all slots. Selection requires a valid DAG, solvable saved order, nontrivial wrong-order ratio, distinct car roles, reachable objects and a real memory change at every switch in the saved solution. Canonical fingerprints disregard node/car names, colours, coordinates and fleet-list order, so those cosmetic changes cannot disguise a duplicate puzzle.

The final catalogue has **35 topology-plus-entry signatures** when initial signs and all cars are removed; this counts different downstream entry placements as different layouts. There are not 48 entirely different binary tree topologies. Early two-switch streets deliberately rehearse a small visual vocabulary; evaluate their pacing with new players. Correct order counts range from one to forty among later puzzles, so the campaign does not impose unique solutions everywhere.

All 48 map images in `release/metadata/review/` and the three contact sheets were visually inspected for exposed roads, labelled ports, target separation and docks. The required reference layout is explicitly different from the top-down tree layouts. Screenshot inspections also covered the full 907×510 UI, the final street at 360×640, the three promotional covers and preview contact sheets. An early SVG clipping defect and a badly cropped initial landscape cover were corrected before final export.

`npm run audit:layout` detects proper intersections between nonadjacent road centreline segments in authored coordinates. The current result is zero. This geometric audit does not replace visual inspection of badge overlap after responsive mapping. Small sign-port labels on dense maps still warrant human phone testing, which is why the submission recommendation starts with landscape.

No final content claims depend on retention, revenue or invented player counts. Difficulty metrics are selection aids rather than proof of fun. Ask fresh testers to describe the read-old/write-new rule after street 3, finish the first 10 without coaching, and sample streets 15/30/48. Record where Preview/Hint becomes necessary, whether mixed entries are clear, and whether any street feels repetitive or needlessly long.
