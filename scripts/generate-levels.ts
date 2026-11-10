import { writeFileSync, mkdirSync } from 'node:fs';
import { generateCandidate, fingerprint } from '../src/core/generator';
import { reference } from '../src/levels/reference';
import type { Level } from '../src/core/model';
const first: Level = {
  id: 'sm-001',
  title: 'A little departure',
  district: 0,
  seed: 1,
  note: 'Tap the coral car. Watch the sign change.',
  nodes: [
    { id: 'E', kind: 'entry', next: 'X', x: 460, y: 35 },
    { id: 'X', kind: 'switch', L: 'H0', R: 'H1', initial: 'L', x: 460, y: 180 },
    { id: 'H0', kind: 'home', color: '#e98873', symbol: '●', x: 260, y: 385 },
    { id: 'H1', kind: 'home', color: '#75b6cd', symbol: '◆', x: 660, y: 385 },
  ],
  cars: [{ id: 'C0', entryId: 'E', destinationId: 'H0', imprint: 'R' }],
  solution: ['C0'],
};
const second: Level = {
  ...structuredClone(first),
  id: 'sm-002',
  title: 'After you',
  seed: 2,
  note: 'The first car leaves R. Who needs the left road?',
  cars: [
    { id: 'C1', entryId: 'E', destinationId: 'H1', imprint: 'L' },
    { id: 'C0', entryId: 'E', destinationId: 'H0', imprint: 'R' },
  ],
  solution: ['C0', 'C1'],
};
const levels: Level[] = [first, second, reference];
const seen = new Set(levels.map(fingerprint));
const titles = [
  'Paper roofs',
  'A small favour',
  'The morning post',
  'Two ways home',
  'One good turn',
  'Neighbourly order',
  'Borrowed directions',
  'Quiet crossing',
  'The long way round',
  'Open windows',
  'Market delivery',
  'Before the bustle',
  'A change of plans',
  'Under the awnings',
  'The right moment',
  'Closing the market',
  'Green paths',
  'A patient gardener',
  'The park gate',
  'Past the fountain',
  'Weekend walkers',
  'A fork in the path',
  'Picnic parcels',
  'A leafy finish',
  'Golden hour',
  'Another entrance',
  'A useful detour',
  'First things first',
  'The little bridge',
  'Passing it on',
  'Evening errands',
  'Last light',
  'Blue rooftops',
  'An unexpected route',
  'The night bakery',
  'Follow the memory',
  'A shared address',
  'Moonlit junctions',
  'Sleepy streets',
  'Good night, town',
  'Homecoming',
  'All connected',
  'A final favour',
  'Every road remembers',
  'Welcome home',
];
let attempts = 0;
for (let i = 3; i < 48; i++) {
  const switches = i < 5 ? 2 : i < 12 ? 2 : i < 24 ? 3 : i < 36 ? 4 : 5;
  const cars = i < 5 ? 3 : i < 12 ? 3 + (i % 2) : i < 24 ? 4 : i < 36 ? 5 : 6;
  let chosen: Level | null = null;
  for (let j = 0; j < 16000; j++) {
    attempts++;
    const candidate = generateCandidate(
      1000 + i * 20000 + j,
      switches,
      cars,
      i >= 13 && i % 3 !== 0,
    );
    if (candidate && !seen.has(fingerprint(candidate))) {
      chosen = candidate;
      break;
    }
  }
  if (!chosen) throw new Error('No quality candidate ' + i);
  seen.add(fingerprint(chosen));
  chosen.id = 'sm-' + String(i + 1).padStart(3, '0');
  chosen.title = titles[i - 3];
  chosen.district = Math.floor(i / 8);
  chosen.cars.sort((a, b) => a.id.localeCompare(b.id));
  levels.push(chosen);
}
mkdirSync('src/levels', { recursive: true });
writeFileSync('src/levels/campaign.json', JSON.stringify(levels, null, 2) + '\n');
console.log(
  `Authored candidate campaign: ${levels.length} levels; ${attempts} bounded attempts. Visual/design review still required.`,
);
