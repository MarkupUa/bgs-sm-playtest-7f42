export interface Save {
  version: 2;
  current: number;
  best: Record<string, number>;
  daily: Record<string, number>;
  settings: { sound: boolean; music: boolean; fast: boolean; reduced: boolean };
}
export function freshSave(): Save {
  return {
    version: 2,
    current: 0,
    best: {},
    daily: {},
    settings: { sound: true, music: true, fast: false, reduced: false },
  };
}
function record(x: unknown): Record<string, number> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {};
  return Object.fromEntries(
    Object.entries(x).filter(
      ([k, v]) =>
        /^(sm-\d{3}|daily-\d{4}-\d{2}-\d{2})$/.test(k) &&
        Number.isInteger(v) &&
        Number(v) >= 1 &&
        Number(v) <= 3,
    ),
  );
}
export function deserialize(raw: string | null): Save {
  const fallback = freshSave();
  try {
    if (!raw) return fallback;
    const x: unknown = JSON.parse(raw);
    if (!x || typeof x !== 'object') return fallback;
    const v = x as Record<string, unknown>;
    if (v.version !== 1 && v.version !== 2) return fallback;
    const settings = (v.settings && typeof v.settings === 'object' ? v.settings : {}) as Record<
      string,
      unknown
    >;
    return {
      version: 2,
      current: Number.isInteger(v.current) ? Math.max(0, Math.min(47, Number(v.current))) : 0,
      best: record(v.best),
      daily: record(v.daily),
      settings: {
        sound: typeof settings.sound === 'boolean' ? settings.sound : true,
        music: typeof settings.music === 'boolean' ? settings.music : true,
        fast: settings.fast === true,
        reduced: settings.reduced === true,
      },
    };
  } catch {
    return fallback;
  }
}
export function serialize(save: Save): string {
  return JSON.stringify(save);
}
