import { deserialize, serialize, type Save } from '../core/serialization';
import type { StoragePort } from '../platform/PlatformAdapter';
export const SAVE_KEY = 'street-memory:save:v2';
export class Progress {
  data: Save;
  constructor(private storage: StoragePort) {
    this.data = deserialize(storage.getItem(SAVE_KEY));
  }
  unlocked() {
    let n = 0;
    while (n < 47 && this.data.best['sm-' + String(n + 1).padStart(3, '0')]) n++;
    return n;
  }
  complete(id: string, stars: number, daily: boolean) {
    const record = daily ? this.data.daily : this.data.best;
    record[id] = Math.max(record[id] ?? 0, stars);
    this.persist();
  }
  persist() {
    this.storage.setItem(SAVE_KEY, serialize(this.data));
  }
}
