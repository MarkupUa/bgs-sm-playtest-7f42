import { writeFileSync } from 'node:fs';
import { campaign } from '../src/levels/campaign';
import { exits } from '../src/core/validation';
import { fingerprint } from '../src/core/generator';
import type { Point } from '../src/core/model';
const orient = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const signatures = new Set<string>();
const crossings: string[] = [];
for (const l of campaign) {
  signatures.add(
    fingerprint({
      ...l,
      cars: [],
      nodes: l.nodes.map((n) => (n.kind === 'switch' ? { ...n, initial: 'L' } : n)),
    }),
  );
  const map = new Map(l.nodes.map((n) => [n.id, n]));
  const edges = l.nodes.flatMap((a) => exits(a).map((id) => [a, map.get(id)!] as const));
  for (let i = 0; i < edges.length; i++)
    for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i],
        [c, d] = edges[j];
      if ([a.id, b.id].some((id) => [c.id, d.id].includes(id))) continue;
      if (orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0)
        crossings.push(`${l.id}: ${a.id}→${b.id} × ${c.id}→${d.id}`);
    }
}
const report = {
  levels: campaign.length,
  distinctTopologyAndEntrySignatures: signatures.size,
  properRoadCenterlineCrossings: crossings,
};
writeFileSync('release/metadata/layout-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(report);
if (crossings.length) process.exitCode = 1;
