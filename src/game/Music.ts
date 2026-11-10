/** Original 8-bar toy-town composition. No samples or external audio requests. */
export const MUSIC_STEP_SECONDS = 60 / 84 / 2;
export const MUSIC_MELODY: readonly (number | null)[] = [
  72,
  null,
  76,
  79,
  null,
  76,
  74,
  null,
  72,
  67,
  null,
  69,
  72,
  null,
  76,
  null,
  76,
  null,
  79,
  81,
  null,
  79,
  76,
  null,
  74,
  72,
  null,
  69,
  72,
  null,
  null,
  null,
  69,
  null,
  72,
  76,
  null,
  74,
  72,
  null,
  69,
  67,
  null,
  65,
  69,
  null,
  72,
  null,
  71,
  null,
  74,
  79,
  null,
  76,
  74,
  null,
  72,
  74,
  null,
  71,
  67,
  null,
  null,
  null,
];
const HARMONY = [
  [48, 52, 55, 59],
  [48, 52, 55, 59],
  [45, 48, 52, 55],
  [45, 48, 52, 55],
  [41, 45, 48, 52],
  [41, 45, 48, 52],
  [43, 47, 50, 52],
  [43, 47, 50, 52],
];
export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
interface Voice {
  oscillator: OscillatorNode;
  gain: GainNode;
}
export class MusicLoop {
  private mix: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private voices = new Set<Voice>();
  private step = 0;
  private nextAt = 0;
  constructor(
    private context: AudioContext,
    output: AudioNode,
  ) {
    this.mix = context.createGain();
    this.mix.gain.value = 0;
    this.mix.connect(output);
  }
  start() {
    if (this.timer !== undefined || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    this.mix.gain.cancelScheduledValues(now);
    this.mix.gain.setValueAtTime(0, now);
    this.mix.gain.linearRampToValueAtTime(0.5, now + 0.15);
    this.nextAt = now + 0.06;
    if (this.step % 8)
      this.harmony(
        Math.floor(this.step / 8),
        this.nextAt,
        (8 - (this.step % 8)) * MUSIC_STEP_SECONDS,
      );
    this.pump();
    this.timer = setInterval(() => this.pump(), 50);
  }
  stop() {
    if (this.timer === undefined) return;
    clearInterval(this.timer);
    this.timer = undefined;
    const now = this.context.currentTime;
    this.mix.gain.cancelScheduledValues(now);
    this.mix.gain.setTargetAtTime(0, now, 0.025);
    for (const voice of this.voices) {
      try {
        voice.oscillator.stop(now + 0.12);
      } catch {
        /* Already ended. */
      }
    }
  }
  private pump() {
    // A stalled/background tab never catches up by emitting a burst of old notes.
    if (this.nextAt < this.context.currentTime - 0.1) this.nextAt = this.context.currentTime + 0.06;
    while (this.nextAt < this.context.currentTime + 0.16) {
      const bar = Math.floor(this.step / 8);
      if (this.step % 8 === 0) this.harmony(bar, this.nextAt, MUSIC_STEP_SECONDS * 8);
      if (this.step % 4 === 0)
        this.note(HARMONY[bar][0] - 12, this.nextAt, MUSIC_STEP_SECONDS * 2, 0.05, 'triangle');
      const pitch = MUSIC_MELODY[this.step];
      if (pitch !== null) this.note(pitch, this.nextAt, MUSIC_STEP_SECONDS * 1.6, 0.065, 'sine');
      this.step = (this.step + 1) % MUSIC_MELODY.length;
      this.nextAt += MUSIC_STEP_SECONDS;
    }
  }
  private harmony(bar: number, at: number, duration: number) {
    for (const pitch of HARMONY[bar].slice(1)) this.note(pitch, at, duration, 0.024, 'sine', 0.25);
  }
  private note(
    pitch: number,
    at: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    attack = 0.025,
  ) {
    const oscillator = this.context.createOscillator(),
      gain = this.context.createGain();
    const voice = { oscillator, gain };
    this.voices.add(voice);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency(pitch), at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + Math.min(attack, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain);
    gain.connect(this.mix);
    oscillator.onended = () => {
      this.voices.delete(voice);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  }
  destroy() {
    this.stop();
    for (const voice of this.voices) {
      try {
        voice.oscillator.stop();
      } catch {
        /* Already ended. */
      }
      voice.oscillator.disconnect();
      voice.gain.disconnect();
    }
    this.voices.clear();
    this.mix.disconnect();
  }
}
