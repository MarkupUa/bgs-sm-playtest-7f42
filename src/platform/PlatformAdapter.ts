export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface PlatformAdapter {
  storage: StoragePort;
  muted: boolean;
  init(): Promise<void>;
  active(value: boolean): void;
  onMute(listener: (muted: boolean) => void): void;
  betweenLevels(): Promise<void>;
  destroy(): void;
}
export function safeStorage(get: () => StoragePort): StoragePort {
  return {
    getItem(k) {
      try {
        return get().getItem(k);
      } catch {
        return null;
      }
    },
    setItem(k, v) {
      try {
        get().setItem(k, v);
      } catch {
        /* Browser storage may be disabled. Session remains playable. */
      }
    },
  };
}
export class StandaloneAdapter implements PlatformAdapter {
  storage = safeStorage(() => localStorage);
  muted = false;
  async init() {}
  active(_v: boolean) {}
  onMute(_fn: (m: boolean) => void) {}
  async betweenLevels() {}
  destroy() {}
}
