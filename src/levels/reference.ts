import type { Level } from '../core/model';
export const reference: Level = {
  id: 'sm-003',
  title: 'A road remembers',
  district: 0,
  seed: 3,
  note: 'Each car follows the sign, then leaves its own.',
  nodes: [
    { id: 'E', kind: 'entry', next: 'X', x: 100, y: 300 },
    { id: 'X', kind: 'switch', L: 'H_RED', R: 'Y', initial: 'L', x: 310, y: 300 },
    { id: 'Y', kind: 'switch', L: 'H_BLUE', R: 'H_GREEN', initial: 'L', x: 570, y: 360 },
    { id: 'H_RED', kind: 'home', color: '#ed806d', symbol: '●', x: 310, y: 130 },
    { id: 'H_BLUE', kind: 'home', color: '#70afca', symbol: '◆', x: 570, y: 130 },
    { id: 'H_GREEN', kind: 'home', color: '#8aaa75', symbol: '▲', x: 790, y: 360 },
  ],
  cars: [
    { id: 'RED', entryId: 'E', destinationId: 'H_RED', imprint: 'R' },
    { id: 'BLUE', entryId: 'E', destinationId: 'H_BLUE', imprint: 'R' },
    { id: 'GREEN', entryId: 'E', destinationId: 'H_GREEN', imprint: 'L' },
  ],
  solution: ['RED', 'BLUE', 'GREEN'],
};
