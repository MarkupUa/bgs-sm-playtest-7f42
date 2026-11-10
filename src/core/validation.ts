import type { Level, Node } from './model';
export const exits = (n: Node): string[] =>
  n.kind === 'entry' ? [n.next] : n.kind === 'switch' ? [n.L, n.R] : [];
export function validateLevel(input: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fail = (message: string) => ({ valid: false, errors: [message], warnings: [] });
  if (!input || typeof input !== 'object') return fail('Expected a level object');
  const raw = input as Record<string, unknown>;
  if (
    !Array.isArray(raw.nodes) ||
    !raw.nodes.length ||
    raw.nodes.length > 64 ||
    !Array.isArray(raw.cars) ||
    !Array.isArray(raw.solution)
  )
    return fail('Expected bounded nodes, cars and solution arrays');
  for (const value of [...raw.nodes, ...raw.cars])
    if (!value || typeof value !== 'object') return fail('Invalid node/car object');
  for (const value of raw.nodes) {
    const n = value as Record<string, unknown>;
    if (typeof n.id !== 'string' || !n.id || typeof n.kind !== 'string')
      return fail('Missing node ID or kind');
    if (n.kind === 'entry' && typeof n.next !== 'string') return fail('Missing entry exit');
    if (n.kind === 'switch' && (typeof n.L !== 'string' || typeof n.R !== 'string'))
      return fail('Missing switch exit');
    if (
      n.kind === 'home' &&
      (typeof n.color !== 'string' ||
        typeof n.symbol !== 'string' ||
        'next' in n ||
        'L' in n ||
        'R' in n)
    )
      return fail('Invalid terminal home');
  }
  for (const value of raw.cars) {
    const c = value as Record<string, unknown>;
    if (['id', 'entryId', 'destinationId', 'imprint'].some((k) => typeof c[k] !== 'string'))
      return fail('Invalid car fields');
  }
  if (raw.solution.some((v) => typeof v !== 'string')) return fail('Solution IDs must be strings');
  const level = input as Level;
  const ids = new Set<string>();
  if (!level.id || !level.cars.length || level.cars.length > 6)
    errors.push('Level needs an ID and 1–6 cars');
  for (const n of level.nodes) {
    if (ids.has(n.id)) errors.push(`Duplicate node ${n.id}`);
    ids.add(n.id);
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) errors.push(`Invalid position ${n.id}`);
    if (n.kind === 'switch' && (n.L === n.R || !['L', 'R'].includes(n.initial)))
      errors.push(`Invalid switch ${n.id}`);
    if (!['entry', 'home', 'switch'].includes(n.kind)) errors.push('Invalid kind');
  }
  const map = new Map(level.nodes.map((n) => [n.id, n]));
  for (const n of level.nodes)
    for (const e of exits(n)) if (!map.has(e)) errors.push(`Missing edge ${n.id} → ${e}`);
  const visited = new Set<string>();
  const active = new Set<string>();
  function visit(id: string) {
    if (active.has(id)) {
      errors.push(`Cycle at ${id}`);
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    active.add(id);
    const n = map.get(id);
    if (n) for (const e of exits(n)) visit(e);
    active.delete(id);
  }
  for (const n of level.nodes) visit(n.id);
  const cars = new Set<string>();
  const reachable = new Set<string>();
  function reach(id: string) {
    if (reachable.has(id)) return;
    reachable.add(id);
    const n = map.get(id);
    if (n) for (const e of exits(n)) reach(e);
  }
  for (const c of level.cars) {
    if (cars.has(c.id) || !c.id) errors.push(`Duplicate/empty car ${c.id}`);
    cars.add(c.id);
    if (map.get(c.entryId)?.kind !== 'entry') errors.push(`Invalid entry for ${c.id}`);
    if (map.get(c.destinationId)?.kind !== 'home') errors.push(`Invalid destination for ${c.id}`);
    if (!['L', 'R'].includes(c.imprint)) errors.push(`Invalid imprint ${c.id}`);
    reach(c.entryId);
    const local = new Set<string>();
    function can(id: string): boolean {
      if (id === c.destinationId) return true;
      if (local.has(id)) return false;
      local.add(id);
      const n = map.get(id);
      return !!n && exits(n).some(can);
    }
    if (!can(c.entryId)) errors.push(`Unreachable destination ${c.id}`);
  }
  for (const n of level.nodes) if (!reachable.has(n.id)) errors.push(`Unreachable node ${n.id}`);
  if (
    level.solution.some((id) => !cars.has(id)) ||
    new Set(level.solution).size !== level.solution.length
  )
    errors.push('Invalid solution IDs');
  return { valid: errors.length === 0, errors, warnings };
}
