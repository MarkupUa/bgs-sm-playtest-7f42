import { describe, it, expect } from 'vitest';
import { initialState, undo } from '../../src/core/model';
import { simulateMove } from '../../src/core/simulateMove';
import { solve } from '../../src/core/solver';
import { validateLevel } from '../../src/core/validation';
import { reference } from '../../src/levels/reference';
describe('immutable road memory', () => {
  it('reads old sign, writes imprint, traces reference and wins', () => {
    let s = initialState(reference);
    const traces = [];
    for (const id of reference.solution) {
      const m = simulateMove(reference, s, id);
      s = m.state;
      traces.push(m.trace);
    }
    expect(traces).toEqual([
      [
        { nodeId: 'E' },
        { nodeId: 'X', previousSign: 'L', selectedExit: 'H_RED', newSign: 'R' },
        { nodeId: 'H_RED' },
      ],
      [
        { nodeId: 'E' },
        { nodeId: 'X', previousSign: 'R', selectedExit: 'Y', newSign: 'R' },
        { nodeId: 'Y', previousSign: 'L', selectedExit: 'H_BLUE', newSign: 'R' },
        { nodeId: 'H_BLUE' },
      ],
      [
        { nodeId: 'E' },
        { nodeId: 'X', previousSign: 'R', selectedExit: 'Y', newSign: 'L' },
        { nodeId: 'Y', previousSign: 'R', selectedExit: 'H_GREEN', newSign: 'L' },
        { nodeId: 'H_GREEN' },
      ],
    ]);
    expect(s.switchStates).toEqual({ X: 'L', Y: 'L' });
    expect(s.phase).toBe('won');
  });
  it('failed move retains changes; Undo restores complete snapshot', () => {
    const s = initialState(reference),
      before = structuredClone(s),
      l = structuredClone(reference);
    const m = simulateMove(reference, s, 'BLUE');
    expect(m.homeId).toBe('H_RED');
    expect(m.state.phase).toBe('failed');
    expect(m.state.switchStates.X).toBe('R');
    expect(undo(m.state)).toEqual(s);
    expect(s).toEqual(before);
    expect(reference).toEqual(l);
  });
  it('undo success and restart', () => {
    const s = initialState(reference);
    expect(undo(simulateMove(reference, s, 'RED').state)).toEqual(s);
    expect(initialState(reference)).toEqual(s);
  });
  it('strict phases, unavailable IDs, maxSteps', () => {
    for (const phase of ['animating', 'failed', 'won', 'paused'] as const)
      expect(() => simulateMove(reference, { ...initialState(reference), phase }, 'RED')).toThrow();
    expect(() => simulateMove(reference, initialState(reference), 'absent')).toThrow();
    const cyclic = structuredClone(reference);
    const x = cyclic.nodes.find((n) => n.id === 'X')!;
    if (x.kind === 'switch') {
      x.L = 'X';
      x.R = 'X';
    }
    expect(() => simulateMove(cyclic, initialState(cyclic), 'RED')).toThrow('maxSteps');
  });
  it('validates DAG, IDs, memory, destinations and exits', () => {
    expect(validateLevel(reference).valid).toBe(true);
    for (const mutate of [
      (l: typeof reference) => {
        l.nodes.push(l.nodes[0]);
      },
      (l: typeof reference) => {
        l.cars.push(l.cars[0]);
      },
      (l: typeof reference) => {
        l.cars[0].destinationId = 'NO';
      },
      (l: typeof reference) => {
        const x = l.nodes[1];
        if (x.kind === 'switch') x.L = 'X';
      },
      (l: typeof reference) => {
        const x = l.nodes[1];
        if (x.kind === 'switch') x.initial = '?' as 'L';
      },
      (l: typeof reference) => {
        const x = l.nodes[1];
        if (x.kind === 'switch') x.R = x.L;
      },
    ]) {
      const l = structuredClone(reference);
      mutate(l);
      expect(validateLevel(l).valid).toBe(false);
    }
  });
  it('solver returns exact reference solution and honest dead ends', () => {
    expect(solve(reference)).toMatchObject({
      count: 1,
      solution: reference.solution,
      firstMoves: ['RED'],
    });
    const s = simulateMove(reference, initialState(reference), 'RED').state;
    expect(solve(reference, s).firstMoves).toEqual(['BLUE']);
    expect(
      solve(reference, simulateMove(reference, initialState(reference), 'BLUE').state).count,
    ).toBe(0);
  });
});

it('validator reports malformed JSON instead of throwing', () => {
  for (const value of [
    null,
    {},
    [],
    { nodes: [], cars: [], solution: [] },
    { nodes: [null], cars: [], solution: [] },
    { nodes: [{ id: 'X', kind: 'switch' }], cars: [], solution: [] },
  ])
    expect(validateLevel(value).valid).toBe(false);
  const l = structuredClone(reference);
  Object.assign(l.nodes.find((n) => n.kind === 'home')!, { next: 'X' });
  expect(validateLevel(l).valid).toBe(false);
});
