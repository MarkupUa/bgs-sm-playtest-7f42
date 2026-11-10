import { campaign } from './campaign';
import { generateCandidate, hash } from '../core/generator';
import type { Level } from '../core/model';
export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
export function dailyLevel(day: string, attempts = 32): Level {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid UTC date');
  const seed = hash('street-memory:daily:v1:' + day);
  for (let i = 0; i < Math.min(32, Math.max(0, attempts)); i++) {
    const l = generateCandidate((seed + i) >>> 0, 4, 5, true);
    if (l) return { ...l, id: 'daily-' + day, title: 'The daily delivery', district: seed % 6 };
  }
  return {
    ...structuredClone(campaign[24 + (seed % 24)]),
    id: 'daily-' + day,
    title: 'The daily delivery',
    seed,
  };
}
