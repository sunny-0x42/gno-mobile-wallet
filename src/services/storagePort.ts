/**
 * Pluggable key-value storage so the same vault/settings code works in:
 * - Expo app / web: AsyncStorage
 * - Chrome extension: chrome.storage.local
 */

export type KvStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

let port: KvStorage | null = null;

export function setStoragePort(next: KvStorage): void {
  port = next;
}

export function getStoragePort(): KvStorage {
  if (port) return port;
  // Lazy default for React Native / Expo web (not used when setStoragePort was called first)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default as {
      getItem: (k: string) => Promise<string | null>;
      setItem: (k: string, v: string) => Promise<void>;
      removeItem: (k: string) => Promise<void>;
    };
    port = {
      getItem: (k) => AsyncStorage.getItem(k),
      setItem: (k, v) => AsyncStorage.setItem(k, v),
      removeItem: (k) => AsyncStorage.removeItem(k),
    };
    return port;
  } catch {
    throw new Error('Storage port not configured — call setStoragePort() first');
  }
}

/** chrome.storage.local adapter (extension service worker / popup). */
export function createChromeStoragePort(): KvStorage {
  const area = globalThis.chrome?.storage?.local;
  if (!area) {
    throw new Error('chrome.storage.local is not available');
  }
  return {
    async getItem(key: string) {
      const bag = await area.get(key);
      const v = bag[key];
      return typeof v === 'string' ? v : v == null ? null : String(v);
    },
    async setItem(key: string, value: string) {
      await area.set({ [key]: value });
    },
    async removeItem(key: string) {
      await area.remove(key);
    },
  };
}
