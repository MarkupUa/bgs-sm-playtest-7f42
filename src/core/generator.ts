import { initialState, type Level, type Node } from './model';
import { simulateMove } from './simulateMove';
import { solve } from './solver';
import { validateLevel } from './validation';
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export type Tree = null | [Tree, Tree];
export const palette = ['#e98873', '#75b6cd', '#a6b978', '#dbb05d', '#b69aca', '#7db6a5'];
export const symbols = ['●', '◆', '▲', '★', '✚', '■'];
export function treeShapes(size: number): Tree[] {
  if (!size) return [null];
  const out: Tree[] = [];
  for (let i = 0; i < size; i++)
    for (const l of treeShapes(i)) for (const r of treeShapes(size - 1 - i)) out.push([l, r]);
  return out;
}
function depth(t: Tree): number {
  return t ? 1 + Math.max(depth(t[0]), depth(t[1])) : 0;
}
export function makeBoard(tree: Tree, seed: number, extraEntry: boolean): Node[] {
  const rng = random(seed);
  const nodes: Node[] = [];
  let leaf = 0,
    sw = 0;
  const leaves = (t: Tree): number => (t ? leaves(t[0]) + leaves(t[1]) : 1);
  const count = leaves(tree);
  function build(t: Tree, d: number): string {
    if (!t) {
      const i = leaf++;
      const id = 'H' + i;
      nodes.push({
        id,
        kind: 'home',
        color: palette[i % 6],
        symbol: symbols[i % 6],
        x: 65 + (790 * i) / (count - 1 || 1),
        y: 410,
      });
      return id;
    }
    const id = 'S' + sw++;
    const L = build(t[0], d + 1),
      R = build(t[1], d + 1);
    const ln = nodes.find((n) => n.id === L)!,
      rn = nodes.find((n) => n.id === R)!;
    nodes.push({
      id,
      kind: 'switch',
      L,
      R,
      initial: rng() < 0.5 ? 'L' : 'R',
      x: (ln.x + rn.x) / 2,
      y: 100 + d * 72,
    });
    return id;
  }
  const root = build(tree, 0);
  const r = nodes.find((n) => n.id === root)!;
  nodes.push({ id: 'E0', kind: 'entry', next: root, x: r.x, y: 32 });
  if (extraEntry) {
    const options = nodes.filter((n) => n.kind === 'switch' && n.id !== root);
    if (options.length) {
      const n = options[Math.floor(rng() * options.length)];
      nodes.push({ id: 'E1', kind: 'entry', next: n.id, x: n.x - 55, y: n.y - 35 });
    }
  }
  return nodes;
}
export function generateCandidate(
  seed: number,
  switchCount: number,
  carCount: number,
  extraEntry = false,
): Level | null {
  const rng = random(seed);
  const shapes = treeShapes(switchCount).filter((t) => depth(t) <= 4);
  const tree = shapes[Math.floor(rng() * shapes.length)];
  const nodes = makeBoard(tree, seed, extraEntry);
  const entries = nodes.filter((n) => n.kind === 'entry');
  const level: Level = {
    id: 'generated-' + seed,
    title: 'Memory lane',
    district: 0,
    nodes,
    cars: [],
    solution: [],
    seed,
  };
  for (let i = 0; i < carCount; i++)
    level.cars.push({
      id: 'C' + i,
      entryId: entries[Math.floor(rng() * entries.length)].id,
      destinationId: 'H0',
      imprint: rng() < 0.5 ? 'L' : 'R',
    });
  const order = level.cars.map((c) => c.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let s = initialState(level);
  const touched = new Set<string>();
  for (const id of order) {
    const result = simulateMove(level, s, id);
    level.cars.find((c) => c.id === id)!.destinationId = result.homeId;
    for (const t of result.trace)
      if (t.previousSign && t.previousSign !== t.newSign) touched.add(t.nodeId);
    s = { ...result.state, phase: 'ready' };
  }
  level.solution = order;
  if (touched.size !== switchCount || !validateLevel(level).valid) return null;
  const report = solve(level);
  let total = 1;
  for (let i = 2; i <= carCount; i++) total *= i;
  if (!report.count || report.count === total || report.count > total * 0.3) return null;
  if (new Set(level.cars.map((c) => c.destinationId)).size < Math.min(3, carCount)) return null;
  if (entries.some((e) => !level.cars.some((c) => c.entryId === e.id))) return null;
  if (
    new Set(level.cars.map((c) => c.entryId + ':' + c.destinationId + ':' + c.imprint)).size !==
    carCount
  )
    return null;
  let verified = initialState(level);
  const changed = new Set<string>();
  for (const id of report.solution) {
    const r = simulateMove(level, verified, id);
    for (const t of r.trace)
      if (t.previousSign && t.previousSign !== t.newSign) changed.add(t.nodeId);
    verified = r.state;
  }
  if (changed.size !== switchCount) return null;
  level.solution = report.solution;
  return level;
}
/** Canonical labelled mechanics, independent of IDs, colours, coordinates and car list order. */
export function fingerprint(level: Level): string {
  const map = new Map(level.nodes.map((n) => [n.id, n]));
  const reachableCount = (id: string, seen = new Set<string>()): number => {
    if (seen.has(id)) return 0;
    seen.add(id);
    const n = map.get(id)!;
    return (
      1 +
      (n.kind === 'entry'
        ? reachableCount(n.next, seen)
        : n.kind === 'switch'
          ? reachableCount(n.L, seen) + reachableCount(n.R, seen)
          : 0)
    );
  };
  const entries = level.nodes
    .filter((n) => n.kind === 'entry')
    .sort((a, b) => reachableCount(b.id) - reachableCount(a.id));
  const labels = new Map<string, number>(),
    ordered: typeof level.nodes = [];
  function visit(id: string) {
    if (labels.has(id)) return;
    const n = map.get(id)!;
    labels.set(id, ordered.length);
    ordered.push(n);
    if (n.kind === 'switch') {
      visit(n.L);
      visit(n.R);
    } else if (n.kind === 'entry') visit(n.next);
  }
  for (const e of entries) if (e.kind === 'entry') visit(e.next);
  const nodeCode = ordered.map((n) =>
    n.kind === 'home'
      ? 'H'
      : n.kind === 'switch'
        ? `${n.initial}:${labels.get(n.L)},${labels.get(n.R)}`
        : 'E',
  );
  const entryCode = (id: string) => {
    const e = map.get(id)!;
    return e.kind === 'entry' ? labels.get(e.next) : undefined;
  };
  return JSON.stringify([
    nodeCode,
    entries.map((e) => entryCode(e.id)).sort(),
    level.cars
      .map((c) => `${entryCode(c.entryId)}:${labels.get(c.destinationId)}:${c.imprint}`)
      .sort(),
  ]);
}
