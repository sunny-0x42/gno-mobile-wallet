import type { NetworkConfig } from '@/config/networks';
import type { PasskeyCredentialMeta } from '@/services/passkey';
import { getStoragePort } from '@/services/storagePort';
import type { CustomToken, LocalTxRecord } from '@/types';

const kv = () => getStoragePort();

const KEYS = {
  activeAccountName: '@gmw/activeAccountName',
  networkId: '@gmw/networkId',
  customNetworks: '@gmw/customNetworks',
  history: '@gmw/history',
  tokens: '@gmw/tokens',
  onboarded: '@gmw/onboarded',
  /** accountName → platform passkey metadata (second factor) */
  passkeys: '@gmw/passkeys/v1',
};

export const storage = {
  async getActiveAccountName(): Promise<string | null> {
    return kv().getItem(KEYS.activeAccountName);
  },
  async setActiveAccountName(name: string): Promise<void> {
    await kv().setItem(KEYS.activeAccountName, name);
  },
  async getNetworkId(): Promise<string | null> {
    return kv().getItem(KEYS.networkId);
  },
  async setNetworkId(id: string): Promise<void> {
    await kv().setItem(KEYS.networkId, id);
  },
  async getCustomNetworks(): Promise<NetworkConfig[]> {
    const raw = await kv().getItem(KEYS.customNetworks);
    return raw ? JSON.parse(raw) : [];
  },
  async setCustomNetworks(list: NetworkConfig[]): Promise<void> {
    await kv().setItem(KEYS.customNetworks, JSON.stringify(list));
  },
  async getHistory(): Promise<LocalTxRecord[]> {
    const raw = await kv().getItem(KEYS.history);
    return raw ? JSON.parse(raw) : [];
  },
  async pushHistory(tx: LocalTxRecord): Promise<void> {
    const list = await this.getHistory();
    list.unshift(tx);
    await kv().setItem(KEYS.history, JSON.stringify(list.slice(0, 200)));
  },
  async updateHistory(id: string, patch: Partial<LocalTxRecord>): Promise<void> {
    const list = await this.getHistory();
    const next = list.map((t) => (t.id === id ? { ...t, ...patch } : t));
    await kv().setItem(KEYS.history, JSON.stringify(next));
  },
  async getTokens(): Promise<CustomToken[]> {
    const raw = await kv().getItem(KEYS.tokens);
    return raw ? JSON.parse(raw) : [];
  },
  async setTokens(tokens: CustomToken[]): Promise<void> {
    await kv().setItem(KEYS.tokens, JSON.stringify(tokens));
  },
  async isOnboarded(): Promise<boolean> {
    return (await kv().getItem(KEYS.onboarded)) === '1';
  },
  async setOnboarded(v: boolean): Promise<void> {
    await kv().setItem(KEYS.onboarded, v ? '1' : '0');
  },

  async getPasskeys(): Promise<Record<string, PasskeyCredentialMeta>> {
    const raw = await kv().getItem(KEYS.passkeys);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, PasskeyCredentialMeta>;
    } catch {
      return {};
    }
  },
  async getPasskey(accountName: string): Promise<PasskeyCredentialMeta | null> {
    const all = await this.getPasskeys();
    return all[accountName] ?? null;
  },
  async setPasskey(meta: PasskeyCredentialMeta): Promise<void> {
    const all = await this.getPasskeys();
    all[meta.accountName] = meta;
    await kv().setItem(KEYS.passkeys, JSON.stringify(all));
  },
  async removePasskey(accountName: string): Promise<void> {
    const all = await this.getPasskeys();
    delete all[accountName];
    await kv().setItem(KEYS.passkeys, JSON.stringify(all));
  },
};
