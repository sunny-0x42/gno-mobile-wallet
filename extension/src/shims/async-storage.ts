/** Shim: extension never uses RN AsyncStorage; storagePort is set to chrome.storage. */
const AsyncStorage = {
  async getItem(_key: string): Promise<string | null> {
    throw new Error('AsyncStorage shim: call setStoragePort(createChromeStoragePort()) first');
  },
  async setItem(_key: string, _value: string): Promise<void> {
    throw new Error('AsyncStorage shim: call setStoragePort(createChromeStoragePort()) first');
  },
  async removeItem(_key: string): Promise<void> {
    throw new Error('AsyncStorage shim: call setStoragePort(createChromeStoragePort()) first');
  },
};
export default AsyncStorage;
