import { it, expect, describe, vi } from 'vitest';
import { campaign } from '../../src/levels/campaign';
import { dailyLevel, utcDay } from '../../src/levels/daily';
import { initialState, type Level, type Sign, type State } from '../../src/core/model';
import { simulateMove } from '../../src/core/simulateMove';
import { solve } from '../../src/core/solver';
import { random, makeBoard, treeShapes, fingerprint } from '../../src/core/generator';
import { validateLevel } from '../../src/core/validation';
import { deserialize, serialize, freshSave } from '../../src/core/serialization';
import { safeStorage, StandaloneAdapter } from '../../src/platform/PlatformAdapter';
import { CrazyGamesAdapter, type SDK, type Settings } from '../../src/platform/CrazyGamesAdapter';
function slowMove(l: Level, s: State, id: string) {
  const car = l.cars.find((c) => c.id === id)!;
  const signs = { ...s.switchStates };
  let at = car.entryId;
  const path: string[] = [];
  while (true) {
    const node = l.nodes.find((n) => n.id === at)!;
    path.push(at);
    if (node.kind === 'home') return { at, signs, path };
    if (node.kind === 'entry') at = node.next;
    else {
      const old = signs[at];
      signs[at] = car.imprint;
      at = old === 'L' ? node.L : node.R;
    }
  }
}
function permutations(ids: string[]): string[][] {
  if (!ids.length) return [[]];
  return ids.flatMap((id) =>
    permutations(ids.filter((i) => i !== id)).map((rest) => [id, ...rest]),
  );
}
describe('campaign and independent exhaustive oracle', () => {
  it('replays all 48 unique nontrivial levels', () => {
    const seen = new Set<string>();
    for (const l of campaign) {
      expect(validateLevel(l).errors, l.id).toEqual([]);
      expect(seen.has(fingerprint(l))).toBe(false);
      seen.add(fingerprint(l));
      let s = initialState(l);
      for (const id of l.solution) {
        expect(solve(l, s).firstMoves).toContain(id);
        s = simulateMove(l, s, id).state;
      }
      expect(s.phase, l.id).toBe('won');
    }
  });
  it('fuzz seeds 1..240: routes and full solution counts match independent permutation oracle', () => {
    for (let seed = 1; seed <= 240; seed++) {
      const rng = random(seed);
      const shapes = treeShapes(1 + (seed % 4));
      const nodes = makeBoard(shapes[Math.floor(rng() * shapes.length)], seed, seed % 2 === 0);
      const entries = nodes.filter((n) => n.kind === 'entry');
      const homes = nodes.filter((n) => n.kind === 'home');
      const l: Level = {
        id: 'fuzz-' + seed,
        title: 'fuzz',
        district: 0,
        seed,
        nodes,
        solution: [],
        cars: Array.from({ length: 1 + (seed % 6) }, (_, i) => ({
          id: 'c' + i,
          entryId: entries[i % entries.length].id,
          destinationId: homes[Math.floor(rng() * homes.length)].id,
          imprint: (rng() < 0.5 ? 'L' : 'R') as Sign,
        })),
      };
      const state = initialState(l);
      for (const c of l.cars) {
        const slow = slowMove(l, state, c.id),
          fast = simulateMove(l, state, c.id);
        expect(
          fast.trace.map((t) => t.nodeId),
          'seed ' + seed,
        ).toEqual(slow.path);
        expect(fast.state.switchStates).toEqual(slow.signs);
        expect(fast.homeId).toBe(slow.at);
      }
      let count = 0;
      for (const order of permutations(state.pendingCarIds)) {
        let s = state;
        let ok = true;
        for (const id of order) {
          const slow = slowMove(l, s, id);
          if (slow.at !== l.cars.find((c) => c.id === id)!.destinationId) {
            ok = false;
            break;
          }
          s = { ...s, switchStates: slow.signs };
        }
        if (ok) count++;
      }
      expect(solve(l).count, 'failing seed ' + seed).toBe(count);
    }
  });
});
it('daily seed UTC, bounded generation and valid fallback', () => {
  expect(utcDay(new Date('2026-11-10T23:30:00-08:00'))).toBe('2026-11-11');
  expect(dailyLevel('2026-11-10')).toEqual(dailyLevel('2026-11-10'));
  expect(dailyLevel('2026-11-11').seed).not.toBe(dailyLevel('2026-11-10').seed);
  for (let day = 1; day <= 28; day++)
    for (const attempts of [0, 32]) {
      const l = dailyLevel('2026-11-' + String(day).padStart(2, '0'), attempts);
      expect(validateLevel(l).valid).toBe(true);
      expect(solve(l).count).toBeGreaterThan(0);
    }
});
it('save round trip, v1 migration, invalid and unavailable storage', () => {
  const s = freshSave();
  s.best['sm-001'] = 3;
  expect(deserialize(serialize(s))).toEqual(s);
  expect(deserialize('{"version":1,"current":2,"settings":{"sound":false}}')).toMatchObject({
    version: 2,
    current: 2,
    settings: { sound: false },
  });
  for (const x of [
    null,
    'broken',
    'null',
    '[]',
    '{"version":99}',
    '{"version":2,"best":{"sm-001":99},"current":999}',
  ]) {
    expect(() => deserialize(x)).not.toThrow();
  }
  expect(deserialize('{"version":2,"best":{"sm-001":99},"current":999}')).toMatchObject({
    current: 47,
    best: {},
  });
  const port = safeStorage(() => {
    throw new Error('Disabled');
  });
  expect(port.getItem('x')).toBe(null);
  expect(() => port.setItem('x', 'y')).not.toThrow();
});
function mockSDK(mode: 'finished' | 'error' | 'throw' = 'finished') {
  let listener: ((s: Settings) => void) | undefined;
  const sdk: SDK = {
    init: vi.fn(async () => {}),
    game: {
      settings: { muteAudio: true },
      gameplayStart: vi.fn(),
      gameplayStop: vi.fn(),
      addSettingsChangeListener: (fn) => {
        listener = fn;
      },
      removeSettingsChangeListener: vi.fn(),
    },
    data: { getItem: () => '{"version":2}', setItem: vi.fn() },
    ad: {
      requestAd: vi.fn((_t, c) => {
        if (mode === 'throw') throw Error('bad');
        c.adStarted();
        if (mode === 'finished') c.adFinished();
        else c.adError('adsDisabled');
      }),
    },
  };
  return { sdk, change: (muteAudio: boolean) => listener?.({ muteAudio }) };
}
describe('platform contract', () => {
  it('standalone has no SDK or ads', async () => {
    const a = new StandaloneAdapter();
    await a.init();
    a.active(true);
    await a.betweenLevels();
    expect(a.muted).toBe(false);
  });
  it('Basic initializes, deduplicates events, forces mute and never calls ads', async () => {
    const { sdk, change } = mockSDK();
    const a = new CrazyGamesAdapter(false, false, async () => sdk);
    a.active(true);
    await a.init();
    a.active(true);
    expect(sdk.game.gameplayStart).toHaveBeenCalledTimes(1);
    expect(a.muted).toBe(true);
    change(false);
    expect(a.muted).toBe(false);
    await a.betweenLevels();
    expect(sdk.ad!.requestAd).not.toHaveBeenCalled();
    a.active(false);
    a.active(false);
    expect(sdk.game.gameplayStop).toHaveBeenCalledTimes(1);
    a.destroy();
    expect(sdk.game.removeSettingsChangeListener).toHaveBeenCalled();
  });
  it.each(['finished', 'error', 'throw'] as const)(
    'Full continues on ad %s and keeps cloud as sole storage',
    async (mode) => {
      const { sdk } = mockSDK(mode);
      const a = new CrazyGamesAdapter(true, true, async () => sdk);
      await a.init();
      expect(a.storage.getItem('x')).toBe('{"version":2}');
      await a.betweenLevels();
      expect(a.muted).toBe(true);
      expect(sdk.ad!.requestAd).toHaveBeenCalledTimes(1);
      a.destroy();
    },
  );
  it('SDK init failure never blocks local play, cloud does not fall back to localStorage', async () => {
    const a = new CrazyGamesAdapter(false, true, async () => {
      throw Error('offline');
    });
    await a.init();
    a.active(true);
    expect(a.storage.getItem('x')).toBe(null);
    await a.betweenLevels();
    a.destroy();
  });
});

it('every campaign switch changes and car roles are distinct', () => {
  for (const l of campaign) {
    let s = initialState(l);
    const changes = new Set<string>();
    for (const id of l.solution) {
      const r = simulateMove(l, s, id);
      for (const t of r.trace)
        if (t.previousSign && t.previousSign !== t.newSign) changes.add(t.nodeId);
      s = r.state;
    }
    expect(changes.size, l.id).toBe(l.nodes.filter((n) => n.kind === 'switch').length);
    expect(new Set(l.cars.map((c) => c.entryId + c.destinationId + c.imprint)).size, l.id).toBe(
      l.cars.length,
    );
  }
});

it('seeded merging DAGs match independent oracle (seeds 301..380)', () => {
  for (let seed = 301; seed <= 380; seed++) {
    const rng = random(seed),
      n = 2 + (seed % 4);
    const nodes: Level['nodes'] = [
      { id: 'E', kind: 'entry', next: 'S0', x: 10, y: 10 },
      { id: 'H0', kind: 'home', color: '#eee', symbol: '●', x: 10, y: 400 },
      { id: 'H1', kind: 'home', color: '#aaa', symbol: '◆', x: 90, y: 400 },
    ];
    for (let i = 0; i < n; i++) {
      const L = i === n - 1 ? 'H0' : 'S' + (i + 1),
        options = [
          ...Array.from({ length: n - i - 1 }, (_, j) => 'S' + (i + 1 + j)),
          'H0',
          'H1',
        ].filter((id) => id !== L);
      nodes.push({
        id: 'S' + i,
        kind: 'switch',
        L,
        R: i === n - 1 ? 'H1' : options[Math.floor(rng() * options.length)],
        initial: rng() < 0.5 ? 'L' : 'R',
        x: 50,
        y: 50 + i * 50,
      });
    }
    const l: Level = {
      id: 'dag-' + seed,
      title: 'DAG',
      district: 0,
      seed,
      nodes,
      solution: [],
      cars: Array.from({ length: 2 + (seed % 5) }, (_, i) => ({
        id: 'c' + i,
        entryId: 'E',
        destinationId: rng() < 0.5 ? 'H0' : 'H1',
        imprint: rng() < 0.5 ? 'L' : 'R',
      })),
    };
    expect(validateLevel(l).valid).toBe(true);
    const initial = initialState(l);
    let count = 0;
    for (const order of permutations(initial.pendingCarIds)) {
      let s = initial,
        ok = true;
      for (const id of order) {
        const slow = slowMove(l, s, id),
          fast = simulateMove(l, s, id);
        expect(fast.state.switchStates, 'DAG seed ' + seed).toEqual(slow.signs);
        if (slow.at !== l.cars.find((c) => c.id === id)!.destinationId) {
          ok = false;
          break;
        }
        s = { ...s, switchStates: slow.signs };
      }
      if (ok) count++;
    }
    expect(solve(l).count, 'DAG seed ' + seed).toBe(count);
  }
});

it('Full ad watchdog releases on missing callbacks and ignores a late adStarted', async () => {
  const { sdk, change } = mockSDK();
  let callbacks: Parameters<NonNullable<SDK['ad']>['requestAd']>[1] | undefined;
  sdk.ad!.requestAd = (_type, c) => {
    callbacks = c;
  };
  const a = new CrazyGamesAdapter(true, true, async () => sdk);
  await a.init();
  change(false);
  vi.useFakeTimers();
  const promise = a.betweenLevels();
  await vi.advanceTimersByTimeAsync(15001);
  await promise;
  expect(a.muted).toBe(false);
  callbacks!.adStarted();
  expect(a.muted).toBe(false);
  vi.useRealTimers();
  a.destroy();
});

it('canonical puzzle fingerprint ignores car/node names, list order, colours and coordinates', () => {
  const l = structuredClone(campaign[14]);
  const renamed = structuredClone(l);
  const map = new Map(renamed.nodes.map((n, i) => [n.id, 'n' + i]));
  for (const n of renamed.nodes) {
    n.id = map.get(n.id)!;
    n.x += 1;
    n.y += 1;
    if (n.kind === 'switch') {
      n.L = map.get(n.L)!;
      n.R = map.get(n.R)!;
    } else if (n.kind === 'entry') n.next = map.get(n.next)!;
    else n.color = '#ffffff';
  }
  renamed.cars.forEach((c, i) => {
    c.id = 'renamed' + i;
    c.entryId = map.get(c.entryId)!;
    c.destinationId = map.get(c.destinationId)!;
  });
  renamed.cars.reverse();
  renamed.nodes.reverse();
  expect(fingerprint(renamed)).toBe(fingerprint(l));
});

it('Full with a disabled Data module never creates a parallel local save', async () => {
  const local = { getItem: vi.fn(), setItem: vi.fn() };
  vi.stubGlobal('localStorage', local);
  const { sdk } = mockSDK();
  sdk.data = undefined;
  const a = new CrazyGamesAdapter(true, true, async () => sdk);
  await a.init();
  expect(a.storage.getItem('progress')).toBe(null);
  a.storage.setItem('progress', 'session');
  expect(local.getItem).not.toHaveBeenCalled();
  expect(local.setItem).not.toHaveBeenCalled();
  a.destroy();
  vi.unstubAllGlobals();
});

it('Full keeps a real long ad paused/muted beyond the pre-start watchdog', async () => {
  const { sdk, change } = mockSDK();
  let callbacks: Parameters<NonNullable<SDK['ad']>['requestAd']>[1] | undefined;
  sdk.ad!.requestAd = (_type, c) => {
    callbacks = c;
    c.adStarted();
  };
  const a = new CrazyGamesAdapter(true, true, async () => sdk);
  await a.init();
  change(false);
  vi.useFakeTimers();
  let released = false;
  const promise = a.betweenLevels().then(() => {
    released = true;
  });
  await vi.advanceTimersByTimeAsync(30000);
  expect(released).toBe(false);
  expect(a.muted).toBe(true);
  callbacks!.adFinished();
  await promise;
  expect(released).toBe(true);
  expect(a.muted).toBe(false);
  vi.useRealTimers();
  a.destroy();
});
