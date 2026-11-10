import { it, expect, vi } from 'vitest';
import { AudioBus } from '../../src/game/Audio';
it('forced mute overrides user toggle and silences existing master immediately', () => {
  const gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    setTargetAtTime: vi.fn(),
  };
  const createOscillator = vi.fn(() => ({
    type: '',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  class Context {
    currentTime = 0;
    state = 'running';
    destination = {};
    createGain() {
      return { gain, connect: vi.fn(), disconnect: vi.fn() };
    }
    createOscillator = createOscillator;
    close() {
      return Promise.resolve();
    }
  }
  vi.stubGlobal('AudioContext', Context);
  const audio = new AudioBus();
  audio.musicEnabled = false;
  audio.gesture();
  audio.tone('sign');
  expect(createOscillator).toHaveBeenCalledTimes(1);
  audio.forced = true;
  expect(gain.value).toBe(0);
  audio.user = false;
  audio.user = true;
  audio.tone('win');
  expect(gain.value).toBe(0);
  expect(createOscillator).toHaveBeenCalledTimes(1);
  audio.forced = false;
  expect(gain.value).toBe(1);
  audio.paused = true;
  expect(gain.value).toBe(0);
  audio.destroy();
  vi.unstubAllGlobals();
});
