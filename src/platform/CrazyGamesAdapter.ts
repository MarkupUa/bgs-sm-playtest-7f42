import { safeStorage, type PlatformAdapter, type StoragePort } from './PlatformAdapter';
export interface Settings {
  muteAudio: boolean;
}
export interface SDK {
  init(): Promise<void>;
  game: {
    settings: Settings;
    gameplayStart(): void;
    gameplayStop(): void;
    addSettingsChangeListener(fn: (s: Settings) => void): void;
    removeSettingsChangeListener(fn: (s: Settings) => void): void;
  };
  data?: StoragePort;
  ad?: {
    requestAd(
      type: 'midgame',
      callbacks: { adStarted(): void; adFinished(): void; adError(error: unknown): void },
    ): void;
  };
}
declare global {
  interface Window {
    CrazyGames?: { SDK: SDK };
  }
}
export class CrazyGamesAdapter implements PlatformAdapter {
  storage: StoragePort;
  muted = false;
  private sdk?: SDK;
  private playing = false;
  private desired = false;
  private listeners: ((m: boolean) => void)[] = [];
  private adMuted = false;
  private platformMuted = false;
  private alive = true;
  constructor(
    private full = false,
    private cloud = false,
    private loader: () => Promise<SDK> = loadSDK,
  ) {
    this.storage = cloud
      ? { getItem: () => null, setItem: () => {} }
      : safeStorage(() => localStorage);
  }
  private changed = (s: Settings) => {
    this.platformMuted = s.muteAudio;
    this.notify();
  };
  private notify() {
    this.muted = this.platformMuted || this.adMuted;
    for (const listener of this.listeners) listener(this.muted);
  }
  async init() {
    try {
      const sdk = await this.loader();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('SDK timeout')), 5000);
        sdk.init().then(
          () => {
            clearTimeout(timer);
            resolve();
          },
          (error) => {
            clearTimeout(timer);
            reject(error);
          },
        );
      });
      if (!this.alive) return;
      this.sdk = sdk;
      this.changed(sdk.game.settings);
      sdk.game.addSettingsChangeListener(this.changed);
      if (this.cloud && sdk.data) this.storage = safeStorage(() => sdk.data!);
      this.active(this.desired);
    } catch {
      /* Local fallback in Basic; cloud mode stays in memory to avoid conflicting copies. */
    }
  }
  onMute(fn: (m: boolean) => void) {
    this.listeners.push(fn);
    fn(this.muted);
  }
  active(v: boolean) {
    this.desired = v;
    if (!this.sdk || this.playing === v) return;
    this.playing = v;
    try {
      if (v) this.sdk.game.gameplayStart();
      else this.sdk.game.gameplayStop();
    } catch {
      /* SDK failure never blocks gameplay. */
    }
  }
  async betweenLevels() {
    if (!this.full || !this.sdk?.ad) return;
    const ad = this.sdk.ad;
    this.active(false);
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.adMuted = false;
        this.notify();
        resolve();
      };
      const timer = setTimeout(finish, 15000);
      try {
        ad.requestAd('midgame', {
          adStarted: () => {
            if (done) return;
            // The pre-start watchdog must never unpause a real ad in progress.
            clearTimeout(timer);
            this.adMuted = true;
            this.notify();
          },
          adFinished: finish,
          adError: finish,
        });
      } catch {
        finish();
      }
    });
  }
  destroy() {
    this.alive = false;
    this.active(false);
    try {
      this.sdk?.game.removeSettingsChangeListener(this.changed);
    } catch {
      /* unavailable SDK */
    }
    this.listeners = [];
  }
}
function loadSDK(): Promise<SDK> {
  if (window.CrazyGames?.SDK) return Promise.resolve(window.CrazyGames.SDK);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => reject(new Error('SDK load timeout')), 5000);
    script.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
    script.onload = () => {
      clearTimeout(timer);
      if (window.CrazyGames?.SDK) resolve(window.CrazyGames.SDK);
      else reject(new Error('SDK missing'));
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error('SDK unavailable'));
    };
    document.head.append(script);
  });
}
