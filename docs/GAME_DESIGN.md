# Street Memory — game design

Choose a car, watch it follow yesterday's directions, and leave tomorrow's directions behind. The player controls only order. The signs are small memories: read old L/R, take that branch, write the roof's L/R. Colour/symbol selects the recipient, while imprint selects the next road rule; neither is tied to the other.

The loop is a choice, a visible causal journey, and a new position to reason about. No timer, lives, score pressure, registration or paid help. A failed delivery stays visible and can be entirely undone. The first street starts without a menu. Street 1 demonstrates one changing sign; street 2 requires order; street 3 uses the explicit RED → BLUE → GREEN two-sign cascade. Streets 4–5 reinforce the rule before larger fleets.

Current sign badges, exit port letters, roof letters and persistent home symbols make the mechanism readable independently of colour. Car approaches are animated, the old sign is held/highlighted, then its new letter appears before the next segment. Fleet cards show the imprint and target symbol. Extra entries are numbered on both dock and car card. Pointer hover and explicit touch Preview show only this car's route; they do not mutate memory.

Hint solves the current exact state and highlights one valid next car. It never fabricates a move to mask a dead end. Stars reward unaided reasoning without locking content: 3 no Hint/Undo, 2 exactly one Undo/no Hint, 1 any other win. Restart preserves effort counters within an attempt. Level select permits replay and shows best stars. Daily is separate, device-local and UTC labelled.

## Campaign

| Streets | Neighbourhood   | Main design progression                                |
| ------- | --------------- | ------------------------------------------------------ |
| 1–8     | Morning Lane    | First dispatch, overwrite, order, two-sign chain       |
| 9–16    | Market Square   | Mixed imprints, larger fleet, first alternate entries  |
| 17–24   | Garden Quarter  | Three-sign dependencies and alternative valid starts   |
| 25–32   | Golden Terraces | Four signs, five cars, downstream entry interactions   |
| 33–40   | Blue Hour       | Linked route preparation and six-car introduction      |
| 41–48   | Lantern Heights | Five-sign finales and several interacting valid orders |

Graph topology, entry assignment, car destinations/imprints and initial signs vary. Six muted board colours change the mood while the visual grammar remains fixed. Maps use ordered trees rather than tangled arbitrary DAGs. Every selected switch changes along the saved solution. No identical car role occurs within a level. Canonical labelled fingerprints prohibit duplicate puzzles; they do not purport to prove all puzzles are aesthetically distinct.

48 levels are automatically solvable and map-reviewed; the catalogue has 35 distinct topology/entry signatures (see `DESIGN_REVIEW.md`). This is designer/agent selection, not a human audience study. First-ten browser playthroughs and all-level solver replay establish usability/correctness only. Enjoyment, difficulty spikes, repeated early motifs and small-screen sign recognition need fresh human playtesting before submission.

The difference from a conventional route puzzle is that each successful traveller edits the shared route for later travellers. There are no manual switches, steering, collisions, timers or invisible traffic physics. The satisfying decision is which delivery prepares the next one.
