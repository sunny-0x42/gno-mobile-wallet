import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NetworkConfig } from '@/config/networks';
import type { CustomToken, LocalTxRecord } from '@/types';

const KEYS = {
  activeAccountName: '@gmw/activeAccountName',
  networkId: '@gmw/networkId',
  customNetworks: '@gmw/customNetworks',
  history: '@gmw/history',
  tokens: '@gmw/tokens',
  onboarded: '@gmw/onboarded',
};

export const storage = {
  async getActiveAccountName(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.activeAccountName);
  },
  async setActiveAccountName(name: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.activeAccountName, name);
  },
  async getNetworkId(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.networkId);
  },
  async setNetworkId(id: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.networkId, id);
  },
  async getCustomNetworks(): Promise<NetworkConfig[]> {
    const raw = await AsyncStorage.getItem(KEYS.customNetworks);
    return raw ? JSON.parse(raw) : [];
  },
  async setCustomNetworks(list: NetworkConfig[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.customNetworks, JSON.stringify(list));
  },
  async getHistory(): Promise<LocalTxRecord[]> {
    const raw = await AsyncStorage.getItem(KEYS.history);
    return raw ? JSON.parse(raw) : [];
  },
  async pushHistory(tx: LocalTxRecord): Promise<void> {
    const list = await this.getHistory();
    list.unshift(tx);
    await AsyncStorage.setItem(KEYS.history, JSON.stringify(list.slice(0, 200)));
  },
  async updateHistory(id: string, patch: Partial<LocalTxRecord>): Promise<void> {
    const list = await this.getHistory();
    const next = list.map((t) => (t.id === id ? { ...t, ...patch } : t));
    await AsyncStorage.setItem(KEYS.history, JSON.stringify(next));
  },
  async getTokens(): Promise<CustomToken[]> {
    const raw = await AsyncStorage.getItem(KEYS.tokens);
    return raw ? JSON.parse(raw) : [];
  },
  async setTokens(tokens: CustomToken[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.tokens, JSON.stringify(tokens));
  },
  async isOnboarded(): Promise<boolean> {
    return (await AsyncStorage.getItem(KEYS.onboarded)) === '1';
  },
  async setOnboarded(v: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.onboarded, v ? '1' : '0');
  },
};
