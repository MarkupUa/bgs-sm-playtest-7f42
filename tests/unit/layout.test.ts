import { it, expect } from 'vitest';
import { campaign } from '../../src/levels/campaign';
import { exits } from '../../src/core/validation';
import { boardPoints, boundsOverlap, nodeBounds, roadsCross } from '../../src/game/layout';

it('keeps dock labels clear of all nodes and never creates road crossings across the campaign', () => {
  const frozen = JSON.stringify(campaign);
  for (const [w, h] of [
    [358, 387],
    [328, 343],
    [343, 268],
    [680, 589],
    [1230, 303],
    [1284, 595],
  ]) {
    const s =
      w < 600 ? Math.max(30, Math.min(36, w * 0.095)) : Math.max(30, Math.min(40, h * 0.22));
    for (const level of campaign) {
      const points = boardPoints(level, w, h, s);
      for (const n of level.nodes.filter((n) => n.kind === 'entry')) {
        for (const other of level.nodes.filter((o) => o.id !== n.id))
          expect(
            boundsOverlap(
              nodeBounds(n, points.get(n.id)!, s),
              nodeBounds(other, points.get(other.id)!, s),
            ),
            `${level.id} ${w}x${h} ${n.id}/${other.id}`,
          ).toBe(false);
      }
      const edges = level.nodes.flatMap((n) =>
        exits(n).map((to) => [points.get(n.id)!, points.get(to)!]),
      );
      for (let i = 0; i < edges.length; i++)
        for (let j = i + 1; j < edges.length; j++)
          expect(
            roadsCross(edges[i][0], edges[i][1], edges[j][0], edges[j][1]),
            `${level.id} ${w}x${h}: crossing`,
          ).toBe(false);
    }
  }
  expect(JSON.stringify(campaign)).toBe(frozen);
});
