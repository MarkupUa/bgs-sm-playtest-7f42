import { writeFileSync, mkdirSync } from 'node:fs';
import { campaign } from '../src/levels/campaign';
import { validateLevel } from '../src/core/validation';
import { analyzeDifficulty } from '../src/core/solver';
import { fingerprint } from '../src/core/generator';
import { initialState } from '../src/core/model';
import { simulateMove } from '../src/core/simulateMove';
const seen = new Set<string>();
const report = [];
for (const level of campaign) {
  const valid = validateLevel(level);
  if (!valid.valid) throw new Error(level.id + ': ' + valid.errors.join('; '));
  const f = fingerprint(level);
  if (seen.has(f)) throw new Error('Duplicate puzzle ' + level.id);
  seen.add(f);
  let s = initialState(level);
  for (const id of level.solution) s = simulateMove(level, s, id).state;
  if (s.phase !== 'won') throw new Error('Invalid solution ' + level.id);
  const metrics = analyzeDifficulty(level);
  if (level.id !== 'sm-001' && metrics.wrongOrderRatio === 0)
    throw new Error('Trivial ' + level.id);
  report.push({ id: level.id, title: level.title, seed: level.seed, ...metrics });
}
mkdirSync('release/metadata', { recursive: true });
writeFileSync('release/metadata/level-audit.json', JSON.stringify(report, null, 2));
console.table(report);
console.log(`PASS: ${campaign.length} unique puzzles validated and replayed.`);
