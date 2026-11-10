import { initialState, type Level, type State } from './model';
import { simulateMove } from './simulateMove';
export interface SolutionReport {
  count: number;
  solution: string[];
  firstMoves: string[];
  reason?: string;
  explored: number;
}
export function solve(level: Level, state: State = initialState(level)): SolutionReport {
  let explored = 0;
  const memo = new Map<string, { count: number; solution: string[]; firstMoves: string[] }>();
  function walk(s: State): { count: number; solution: string[]; firstMoves: string[] } {
    if (s.phase === 'failed') return { count: 0, solution: [], firstMoves: [] };
    if (!s.pendingCarIds.length) return { count: 1, solution: [], firstMoves: [] };
    const key = JSON.stringify([
      s.pendingCarIds.slice().sort(),
      Object.entries(s.switchStates).sort(([a], [b]) => a.localeCompare(b)),
    ]);
    const cached = memo.get(key);
    if (cached) return cached;
    explored++;
    let count = 0;
    let solution: string[] = [];
    const firstMoves: string[] = [];
    for (const id of s.pendingCarIds) {
      const move = simulateMove(level, { ...s, phase: 'ready', history: [] }, id);
      if (!move.correct) continue;
      const next = walk(move.state);
      if (next.count) {
        firstMoves.push(id);
        if (!count) solution = [id, ...next.solution];
        count += next.count;
      }
    }
    const result = { count, solution, firstMoves };
    memo.set(key, result);
    return result;
  }
  const result = walk(state);
  return {
    ...result,
    explored,
    ...(!result.count ? { reason: 'No solution from here — Undo or Restart' } : {}),
  };
}
export function analyzeDifficulty(level: Level) {
  const r = solve(level);
  let permutations = 1;
  for (let i = 2; i <= level.cars.length; i++) permutations *= i;
  return {
    cars: level.cars.length,
    switches: level.nodes.filter((n) => n.kind === 'switch').length,
    solutions: r.count,
    firstMoves: r.firstMoves.length,
    wrongOrderRatio: 1 - r.count / permutations,
    explored: r.explored,
  };
}
