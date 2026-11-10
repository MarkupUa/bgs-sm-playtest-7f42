import type { Level, Node, Point } from '../core/model';
import { exits } from '../core/validation';

export function nodeBounds(node: Node, p: Point, size: number) {
  const x = node.kind === 'home' ? size * 0.8 : size * (node.kind === 'entry' ? 0.55 : 0.7);
  return {
    left: p.x - x,
    right: p.x + x,
    top: p.y - size * (node.kind === 'home' ? 1.02 : node.kind === 'entry' ? 0.4 : 0.53),
    bottom: p.y + size * (node.kind === 'home' ? 0.72 : node.kind === 'entry' ? 0.4 : 0.53),
  };
}
type Bounds = ReturnType<typeof nodeBounds>;
export function boundsOverlap(a: Bounds, b: Bounds, gap = 3) {
  return (
    a.left < b.right + gap &&
    a.right > b.left - gap &&
    a.top < b.bottom + gap &&
    a.bottom > b.top - gap
  );
}
function side(a: Point, b: Point, p: Point) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}
export function roadsCross(a: Point, b: Point, c: Point, d: Point) {
  return side(a, b, c) * side(a, b, d) < -0.001 && side(c, d, a) * side(c, d, b) < -0.001;
}
function roadHitsBox(a: Point, b: Point, box: Bounds, margin: number) {
  // Sampling is only a placement score; node overlap and road crossings are hard constraints.
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 5);
  for (let i = 0; i <= steps; i++) {
    const x = a.x + ((b.x - a.x) * i) / steps;
    const y = a.y + ((b.y - a.y) * i) / steps;
    if (
      x > box.left - margin &&
      x < box.right + margin &&
      y > box.top - margin &&
      y < box.bottom + margin
    )
      return true;
  }
  return false;
}

/** Display coordinates only. Never writes to the frozen puzzle or its topology. */
export function boardPoints(level: Level, w: number, h: number, size: number) {
  const points = new Map<string, Point>();
  const xs = level.nodes.map((n) => n.x),
    ys = level.nodes.map((n) => n.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const padX = w < 600 ? 27 : 38,
    padY = h < 210 ? 26 : 36;
  for (const n of level.nodes)
    points.set(n.id, {
      x: padX + ((n.x - minX) / (maxX - minX || 1)) * (w - 2 * padX),
      y: padY + ((n.y - minY) / (maxY - minY || 1)) * (h - 2 * padY),
    });
  const placed: Node[] = level.nodes.filter((n) => n.kind !== 'entry');
  const edges = placed.flatMap((n) => exits(n).map((id) => [points.get(n.id)!, points.get(id)!]));
  for (const node of level.nodes) {
    if (node.kind !== 'entry') continue;
    const original = points.get(node.id)!,
      end = points.get(node.next)!;
    const candidates = [original];
    for (let radius = size * 1.15; radius <= size * 3.6; radius += 6) {
      for (let i = 0; i < 48; i++) {
        const angle = (i * Math.PI) / 24;
        candidates.push({
          x: end.x + Math.cos(angle) * radius,
          y: end.y + Math.sin(angle) * radius,
        });
      }
    }
    let best = original,
      bestScore = Infinity;
    for (const p of candidates) {
      const box = nodeBounds(node, p, size);
      if (box.left < 3 || box.right > w - 3 || box.top < 3 || box.bottom > h - 3) continue;
      if (placed.some((n) => boundsOverlap(box, nodeBounds(n, points.get(n.id)!, size)))) continue;
      if (edges.some(([a, b]) => roadsCross(p, end, a, b))) continue;
      const obscured = edges.filter(([a, b]) => roadHitsBox(a, b, box, size * 0.29 + 2)).length;
      const score =
        obscured * 10000 +
        Math.hypot(p.x - original.x, p.y - original.y) +
        Math.hypot(p.x - end.x, p.y - end.y) * 0.15;
      if (score < bestScore) {
        best = p;
        bestScore = score;
      }
    }
    points.set(node.id, best);
    edges.push([best, end]);
    placed.push(node);
  }
  return points;
}
