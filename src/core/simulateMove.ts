import { snapshot, type Level, type State, type MoveResult, type Trace } from './model';
export function simulateMove(level: Level, state: State, carId: string): MoveResult {
  if (state.phase !== 'ready' || !state.pendingCarIds.includes(carId))
    throw new Error('Move unavailable');
  const car = level.cars.find((c) => c.id === carId);
  if (!car) throw new Error('Unknown car');
  const nodes = new Map(level.nodes.map((n) => [n.id, n]));
  const signs = { ...state.switchStates };
  const trace: Trace[] = [];
  let id = car.entryId;
  for (let steps = 0; steps <= level.nodes.length; steps++) {
    const node = nodes.get(id);
    if (!node) throw new Error('Unknown node');
    if (node.kind === 'home') {
      trace.push({ nodeId: id });
      const correct = id === car.destinationId;
      const pending = state.pendingCarIds.filter((c) => c !== carId);
      return {
        trace,
        homeId: id,
        correct,
        state: {
          switchStates: signs,
          pendingCarIds: pending,
          deliveredCarIds: correct ? [...state.deliveredCarIds, carId] : [...state.deliveredCarIds],
          history: [...state.history, snapshot(state)],
          phase: correct ? (pending.length ? 'ready' : 'won') : 'failed',
          moves: state.moves + 1,
        },
      };
    }
    if (node.kind === 'entry') {
      trace.push({ nodeId: id });
      id = node.next;
      continue;
    }
    const old = signs[id];
    if (old !== 'L' && old !== 'R') throw new Error('Missing switch memory');
    const next = node[old];
    trace.push({ nodeId: id, previousSign: old, selectedExit: next, newSign: car.imprint });
    signs[id] = car.imprint;
    id = next;
  }
  throw new Error('Route exceeded maxSteps');
}
