/**
 * Real Gno wallet client for web / PWA using @gnolang/gno-js-client.
 * Creates real g1 addresses compatible with Adena / gnokey (same HD path + prefix).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GnoJSONRPCProvider,
  GnoWallet,
  defaultTxFee,
} from '@gnolang/gno-js-client';
import { TransactionEndpoint } from '@gnolang/tm2-js-client';
import { BUILTIN_NETWORKS, DEFAULT_NETWORK_ID } from '@/config/networks';
import type { WalletAccount } from '@/types';
import { decryptSecret, encryptSecret } from '@/utils/cryptoVault';
import { checkMnemonic, generateMnemonic12, normalizeMnemonic } from '@/utils/mnemonic';
import { fetchAllBalances, fetchNativeBalances } from '@/services/rpcBalance';
import type { BalanceResult, CallResult, GnoClient } from '@/services/gnoClient';

const VAULT_KEY = '@gmw/webVault/v1';

type VaultRecord = {
  name: string;
  address: string;
  /** AES-GCM encrypted mnemonic */
  secret: string;
};

type SessionEntry = {
  record: VaultRecord;
  wallet: GnoWallet;
  mnemonic: string;
  password: string;
};

export class WebGnoClient implements GnoClient {
  readonly isMock = false;
  private remote =
    BUILTIN_NETWORKS.find((n) => n.id === DEFAULT_NETWORK_ID)?.remote ??
    'https://rpc.topaz.testnets.gno.land:443';
  private chainId =
    BUILTIN_NETWORKS.find((n) => n.id === DEFAULT_NETWORK_ID)?.chainId ?? 'topaz-1';
  private provider: Awaited<ReturnType<typeof GnoJSONRPCProvider.create>> | null = null;
  private session = new Map<string, SessionEntry>();
  private activeName: string | null = null;

  private async loadVault(): Promise<VaultRecord[]> {
    const raw = await AsyncStorage.getItem(VAULT_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as VaultRecord[];
    } catch {
      return [];
    }
  }

  private async saveVault(records: VaultRecord[]): Promise<void> {
    await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(records));
  }

  private async buildWallet(mnemonic: string): Promise<GnoWallet> {
    const phrase = normalizeMnemonic(mnemonic);
    // Derive key offline first — do not require RPC for create/import
    const wallet = await GnoWallet.fromMnemonic(phrase, {
      addressPrefix: 'g',
      accountIndex: 0,
    });
    // Connect RPC when available (balance/send); ignore offline create
    try {
      const provider = await this.ensureProvider();
      wallet.connect(provider);
    } catch {
      // RPC optional at create time
    }
    return wallet;
  }

  async setNetwork(remote: string, chainId: string): Promise<void> {
    this.remote = remote;
    this.chainId = chainId;
    this.provider = null; // reconnect lazily
    try {
      this.provider = await GnoJSONRPCProvider.create(remote);
      for (const entry of this.session.values()) {
        entry.wallet.connect(this.provider);
      }
    } catch {
      // Keep working offline for create/import; balance/send will error with clear message
      this.provider = null;
    }
  }

  private async ensureProvider() {
    if (!this.provider) {
      try {
        this.provider = await GnoJSONRPCProvider.create(this.remote);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`RPC connect failed (${this.remote}): ${msg}`);
      }
    }
    return this.provider;
  }

  async generateRecoveryPhrase(): Promise<string> {
    try {
      return generateMnemonic12();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Could not generate seed: ${msg}`);
    }
  }

  async createAccount(
    name: string,
    mnemonic: string,
    password: string,
  ): Promise<WalletAccount> {
    const checked = checkMnemonic(mnemonic);
    if (!checked.ok) {
      throw new Error(checked.reason);
    }
    const phrase = checked.phrase;
    if (password.length < 8) {
      throw new Error('Password min 8 characters');
    }

    let wallet: GnoWallet;
    try {
      wallet = await this.buildWallet(phrase);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Could not derive address from seed: ${msg}`);
    }

    const address = await wallet.getAddress();

    let secret: string;
    try {
      secret = await encryptSecret(phrase, password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Could not encrypt seed for storage: ${msg}`);
    }

    let vault = await this.loadVault();
    vault = vault.filter((r) => r.name !== name);
    const record: VaultRecord = { name, address, secret };
    vault.push(record);
    await this.saveVault(vault);

    this.session.set(name, { record, wallet, mnemonic: phrase, password });
    this.activeName = name;
    return { name, address };
  }

  async listAccounts(): Promise<WalletAccount[]> {
    const vault = await this.loadVault();
    return vault.map((r) => ({ name: r.name, address: r.address }));
  }

  async hasKeyByName(name: string): Promise<boolean> {
    const vault = await this.loadVault();
    return vault.some((r) => r.name === name);
  }

  /**
   * Activate unlocked session, or unlock with password if provided via setPassword after.
   * If not in session, throws — caller should use unlockAccount(name, password).
   */
  async activateAccount(name: string): Promise<WalletAccount | null> {
    const entry = this.session.get(name);
    if (entry) {
      this.activeName = name;
      const provider = await this.ensureProvider();
      entry.wallet.connect(provider);
      return { name: entry.record.name, address: entry.record.address };
    }
    // Try load metadata only — signing requires unlock
    const vault = await this.loadVault();
    const rec = vault.find((r) => r.name === name);
    if (!rec) return null;
    this.activeName = name;
    return { name: rec.name, address: rec.address };
  }

  /** Unlock vault entry with password (needed after page reload to sign). */
  async unlockAccount(name: string, password: string): Promise<WalletAccount> {
    const vault = await this.loadVault();
    const rec = vault.find((r) => r.name === name);
    if (!rec) throw new Error('Account not found');
    let mnemonic: string;
    try {
      mnemonic = await decryptSecret(rec.secret, password);
    } catch {
      throw new Error('Wrong password');
    }
    const wallet = await this.buildWallet(mnemonic);
    const address = await wallet.getAddress();
    if (address !== rec.address) {
      throw new Error('Address mismatch after unlock');
    }
    this.session.set(name, {
      record: rec,
      wallet,
      mnemonic,
      password,
    });
    this.activeName = name;
    return { name, address };
  }

  async setPassword(_password: string, _addressBytes?: Uint8Array): Promise<void> {
    // Password already used at create/unlock; no-op for web client.
  }

  async deleteAccount(name: string): Promise<void> {
    const vault = (await this.loadVault()).filter((r) => r.name !== name);
    await this.saveVault(vault);
    this.session.delete(name);
    if (this.activeName === name) this.activeName = null;
  }

  private async requireUnlockedWallet(from?: WalletAccount): Promise<GnoWallet> {
    const name = from?.name ?? this.activeName;
    if (!name) throw new Error('No active account');
    const entry = this.session.get(name);
    if (!entry) {
      throw new Error(
        'Wallet locked. Open Settings → Unlock, or re-import with password before sending.',
      );
    }
    const provider = await this.ensureProvider();
    entry.wallet.connect(provider);
    return entry.wallet;
  }

  async queryBalance(address: string): Promise<BalanceResult> {
    // Prefer browser-safe direct RPC (no Node Buffer dependency)
    try {
      const natives = await fetchNativeBalances(this.remote, address);
      const ugnot = natives.find((c) => c.denom === 'ugnot')?.amount ?? '0';
      const anyCoin = natives.length > 0;
      return {
        ugnot,
        unknownAddress: !anyCoin && ugnot === '0',
      };
    } catch {
      // Fallback to gno-js-client (needs Buffer polyfill)
      try {
        const provider = await this.ensureProvider();
        const ugnot = await provider.getBalance(address, 'ugnot');
        return {
          ugnot: String(Math.floor(Number(ugnot) || 0)),
          unknownAddress: false,
        };
      } catch {
        return { ugnot: '0', unknownAddress: true };
      }
    }
  }

  /** Full multi-asset snapshot for Home UI */
  async queryAllBalances(address: string) {
    return fetchAllBalances(this.remote, address, this.chainId);
  }

  async send(
    from: WalletAccount,
    toBech32: string,
    amountUgnot: string,
    gasFee: string,
    gasWanted: bigint,
    memo?: string,
  ): Promise<{ hash?: string; raw?: string }> {
    const wallet = await this.requireUnlockedWallet(from);
    const funds = new Map<string, number>([['ugnot', Number(amountUgnot)]]);
    if (!Number.isFinite(Number(amountUgnot)) || Number(amountUgnot) <= 0) {
      throw new Error('Invalid amount');
    }

    const fee = {
      gas_wanted: gasWanted > 0n ? gasWanted : 200000n,
      gas_fee: gasFee || defaultTxFee,
    };

    // transferFunds does not take memo in API — ok for basic sends
    void memo;
    const result = await wallet.transferFunds(
      toBech32.trim(),
      funds,
      TransactionEndpoint.BROADCAST_TX_COMMIT,
      fee,
    );

    // result shape varies by endpoint — try common fields
    const anyRes = result as {
      hash?: string;
      tx_response?: { hash?: string };
      deliver_tx?: { log?: string };
    };
    const hash = anyRes.hash ?? anyRes.tx_response?.hash;
    return { hash: hash ? String(hash) : undefined, raw: JSON.stringify(result) };
  }

  async call(
    from: WalletAccount,
    pkgPath: string,
    func: string,
    args: string[],
    gasFee: string,
    gasWanted: bigint,
    send?: string,
  ): Promise<CallResult> {
    const wallet = await this.requireUnlockedWallet(from);
    const fee = {
      gas_wanted: gasWanted > 0n ? gasWanted : 5_000_000n,
      gas_fee: gasFee || defaultTxFee,
    };
    let funds: Map<string, number> | undefined;
    if (send) {
      const m = send.match(/^(\d+)ugnot$/);
      if (m) funds = new Map([['ugnot', Number(m[1])]]);
    }
    const result = await wallet.callMethod(
      pkgPath,
      func,
      args.length ? args : null,
      TransactionEndpoint.BROADCAST_TX_COMMIT,
      funds,
      undefined,
      fee,
    );
    return { raw: JSON.stringify(result, null, 2) };
  }

  isUnlocked(name?: string): boolean {
    const n = name ?? this.activeName;
    return !!(n && this.session.has(n));
  }
}

export function createWebGnoClient(): WebGnoClient {
  return new WebGnoClient();
}
