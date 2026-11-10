import { MusicLoop } from './Music';
export class AudioBus {
  private context?: AudioContext;
  private master?: GainNode;
  private musicLoop?: MusicLoop;
  private _musicEnabled = true;
  get musicEnabled() {
    return this._musicEnabled;
  }
  set musicEnabled(v: boolean) {
    this._musicEnabled = v;
    this.apply();
  }
  private _user = true;
  private _forced = false;
  private _paused = false;
  get user() {
    return this._user;
  }
  set user(v: boolean) {
    this._user = v;
    this.apply();
  }
  get forced() {
    return this._forced;
  }
  set forced(v: boolean) {
    this._forced = v;
    this.apply();
  }
  get paused() {
    return this._paused;
  }
  set paused(v: boolean) {
    this._paused = v;
    this.apply();
  }
  private apply() {
    const audible = this.user && !this.forced && !this.paused;
    if (this.master) this.master.gain.value = audible ? 1 : 0;
    if (audible && this.musicEnabled) this.musicLoop?.start();
    else this.musicLoop?.stop();
  }
  gesture() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.musicLoop = new MusicLoop(this.context, this.master);
        this.apply();
      }
      if (this.context.state !== 'running')
        void this.context
          .resume()
          .then(() => this.apply())
          .catch(() => {});
      else this.apply();
    } catch {
      /* Audio is optional. */
    }
  }
  tone(type: 'send' | 'sign' | 'win' | 'fail' | 'confirm') {
    if (!this.context || !this.master || !this.user || this.forced || this.paused) return;
    const ctx = this.context;
    const notes =
      type === 'win'
        ? [523.25, 659.25, 783.99, 1046.5]
        : type === 'fail'
          ? [246.94, 196]
          : type === 'confirm'
            ? [523.25, 783.99]
            : type === 'sign'
              ? [698.46]
              : [392, 523.25];
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.11;
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
      oscillator.connect(gain);
      gain.connect(this.master!);
      oscillator.start(start);
      oscillator.stop(start + 0.21);
    });
  }
  destroy() {
    this.musicLoop?.destroy();
    void this.context?.close().catch(() => {});
  }
}
