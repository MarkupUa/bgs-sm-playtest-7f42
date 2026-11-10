export type Sign = 'L' | 'R';
export type Phase = 'ready' | 'animating' | 'failed' | 'won' | 'paused';
export interface Point {
  x: number;
  y: number;
}
export type Node = Point &
  (
    | { id: string; kind: 'entry'; next: string }
    | { id: string; kind: 'switch'; L: string; R: string; initial: Sign }
    | { id: string; kind: 'home'; color: string; symbol: string }
  );
export interface Car {
  id: string;
  entryId: string;
  destinationId: string;
  imprint: Sign;
}
export interface Level {
  id: string;
  title: string;
  district: number;
  nodes: Node[];
  cars: Car[];
  solution: string[];
  seed: number;
  note?: string;
}
export interface Snapshot {
  switchStates: Record<string, Sign>;
  pendingCarIds: string[];
  deliveredCarIds: string[];
  phase: Phase;
  moves: number;
}
export interface State extends Snapshot {
  history: Snapshot[];
}
export interface Trace {
  nodeId: string;
  previousSign?: Sign;
  selectedExit?: string;
  newSign?: Sign;
}
export interface MoveResult {
  state: State;
  trace: Trace[];
  homeId: string;
  correct: boolean;
}
export function initialState(level: Level): State {
  return {
    switchStates: Object.fromEntries(
      level.nodes
        .filter((n) => n.kind === 'switch')
        .map((n) => [n.id, n.kind === 'switch' ? n.initial : 'L']),
    ) as Record<string, Sign>,
    pendingCarIds: level.cars.map((c) => c.id),
    deliveredCarIds: [],
    history: [],
    phase: 'ready',
    moves: 0,
  };
}
export function snapshot(s: State): Snapshot {
  return {
    switchStates: { ...s.switchStates },
    pendingCarIds: [...s.pendingCarIds],
    deliveredCarIds: [...s.deliveredCarIds],
    phase: s.phase,
    moves: s.moves,
  };
}
export function undo(s: State): State {
  if (s.phase === 'animating' || s.phase === 'paused' || !s.history.length) return s;
  const previous = s.history.at(-1)!;
  return {
    ...previous,
    switchStates: { ...previous.switchStates },
    pendingCarIds: [...previous.pendingCarIds],
    deliveredCarIds: [...previous.deliveredCarIds],
    history: s.history.slice(0, -1),
  };
}
