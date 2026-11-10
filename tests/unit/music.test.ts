import { it, expect, vi } from 'vitest';
import { MusicLoop, MUSIC_MELODY, MUSIC_STEP_SECONDS, frequency } from '../../src/game/Music';
import { deserialize, freshSave, serialize } from '../../src/core/serialization';
function fakeContext() {
  const sources: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  const gain = () => ({
    gain: {
      value: 0,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  const context = {
    state: 'running',
    currentTime: 0,
    createGain: gain,
    createOscillator: () => {
      const source = {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      sources.push(source);
      return source;
    },
  };
  return { context, sources, output: gain() };
}
it('original loop is finite, in a safe pitch range and uses continuous eight-bar timing', () => {
  expect(MUSIC_MELODY).toHaveLength(64);
  expect(MUSIC_STEP_SECONDS * 64).toBeCloseTo(22.85714);
  expect(frequency(69)).toBe(440);
  expect(MUSIC_MELODY.filter((n) => n !== null).every((n) => n >= 60 && n <= 84)).toBe(true);
});
it('music owns one timer, skips stale backlog and cleans up through repeated pause/resume', () => {
  vi.useFakeTimers();
  const { context, sources, output } = fakeContext();
  const loop = new MusicLoop(context as unknown as AudioContext, output as unknown as AudioNode);
  loop.start();
  expect(vi.getTimerCount()).toBe(1);
  const first = sources.length;
  expect(first).toBeGreaterThan(0);
  loop.start();
  expect(sources).toHaveLength(first);
  context.currentTime = 60;
  vi.advanceTimersByTime(50);
  expect(sources.length - first).toBeLessThanOrEqual(5);
  for (let i = 0; i < 50; i++) {
    loop.stop();
    expect(vi.getTimerCount()).toBe(0);
    context.currentTime += 1;
    loop.start();
    loop.start();
    expect(vi.getTimerCount()).toBe(1);
  }
  loop.destroy();
  expect(vi.getTimerCount()).toBe(0);
  expect(sources.every((s) => s.disconnect.mock.calls.length > 0)).toBe(true);
  vi.useRealTimers();
});
it('a suspended context cannot start music without a successful gesture resume', () => {
  vi.useFakeTimers();
  const { context, sources, output } = fakeContext();
  context.state = 'suspended';
  const loop = new MusicLoop(context as unknown as AudioContext, output as unknown as AudioNode);
  loop.start();
  expect(sources).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
  loop.destroy();
  vi.useRealTimers();
});
it('music preference survives saves and old schema-v2 saves default safely', () => {
  const save = freshSave();
  save.settings.music = false;
  expect(deserialize(serialize(save)).settings.music).toBe(false);
  expect(deserialize('{"version":2,"settings":{"sound":false}}').settings).toMatchObject({
    sound: false,
    music: true,
  });
  expect(deserialize('{"version":2,"settings":{"music":"false"}}').settings.music).toBe(true);
});
