/**
 * Thin adapter over @gnolang/gnonative with a Mock implementation for UI work
 * without native modules.
 *
 * Real device path: set EXPO_PUBLIC_USE_MOCK=0 and run `expo prebuild` + native build.
 */

import type { WalletAccount } from '@/types';
import { BUILTIN_NETWORKS, DEFAULT_NETWORK_ID } from '@/config/networks';

export type BalanceResult = {
  /** ugnot as string */
  ugnot: string;
  /** true when account has never appeared on-chain */
  unknownAddress: boolean;
};

export type CallResult = {
  raw: string;
};

export interface GnoClient {
  readonly isMock: boolean;
  setNetwork(remote: string, chainId: string): Promise<void>;
  generateRecoveryPhrase(): Promise<string>;
  createAccount(name: string, mnemonic: string, password: string): Promise<WalletAccount>;
  listAccounts(): Promise<WalletAccount[]>;
  hasKeyByName(name: string): Promise<boolean>;
  activateAccount(name: string): Promise<WalletAccount | null>;
  setPassword(password: string, addressBytes?: Uint8Array): Promise<void>;
  deleteAccount(name: string, password?: string): Promise<void>;
  queryBalance(address: string): Promise<BalanceResult>;
  send(
    from: WalletAccount,
    toBech32: string,
    amountUgnot: string,
    gasFee: string,
    gasWanted: bigint,
    memo?: string,
  ): Promise<{ hash?: string; raw?: string }>;
  call(
    from: WalletAccount,
    pkgPath: string,
    func: string,
    args: string[],
    gasFee: string,
    gasWanted: bigint,
    send?: string,
  ): Promise<CallResult>;
}

// ─── Mock client (web / no native) ───────────────────────────────────────────

const BIP39_SAMPLE =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

type MockKey = {
  name: string;
  mnemonic: string;
  password: string;
  address: string;
};

function mockAddressFromName(name: string): string {
  // Deterministic fake g1 for UI only — NOT a real Gno address
  const hex = Array.from(name)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(38, '0')
    .slice(0, 38);
  return `g1mock${hex}`.slice(0, 42);
}

class MockGnoClient implements GnoClient {
  readonly isMock = true;
  private keys: MockKey[] = [];
  private balances = new Map<string, number>();
  private remote = BUILTIN_NETWORKS.find((n) => n.id === DEFAULT_NETWORK_ID)!.remote;
  private chainId = BUILTIN_NETWORKS.find((n) => n.id === DEFAULT_NETWORK_ID)!.chainId;

  async setNetwork(remote: string, chainId: string): Promise<void> {
    this.remote = remote;
    this.chainId = chainId;
  }

  async generateRecoveryPhrase(): Promise<string> {
    // Mock: fixed known phrase for demos. Real client uses secure RNG.
    return BIP39_SAMPLE;
  }

  async createAccount(name: string, mnemonic: string, password: string): Promise<WalletAccount> {
    if (this.keys.some((k) => k.name === name)) {
      this.keys = this.keys.filter((k) => k.name !== name);
    }
    const address = mockAddressFromName(name);
    this.keys.push({ name, mnemonic: mnemonic.trim(), password, address });
    this.balances.set(address, this.balances.get(address) ?? 10_000_000); // 10 GNOT faucet sim
    return { name, address };
  }

  async listAccounts(): Promise<WalletAccount[]> {
    return this.keys.map((k) => ({ name: k.name, address: k.address }));
  }

  async hasKeyByName(name: string): Promise<boolean> {
    return this.keys.some((k) => k.name === name);
  }

  async activateAccount(name: string): Promise<WalletAccount | null> {
    const k = this.keys.find((x) => x.name === name);
    return k ? { name: k.name, address: k.address } : null;
  }

  async setPassword(_password: string, _addressBytes?: Uint8Array): Promise<void> {
    // no-op in mock
  }

  async deleteAccount(name: string): Promise<void> {
    this.keys = this.keys.filter((k) => k.name !== name);
  }

  async queryBalance(address: string): Promise<BalanceResult> {
    if (!this.balances.has(address)) {
      return { ugnot: '0', unknownAddress: true };
    }
    return { ugnot: String(this.balances.get(address)), unknownAddress: false };
  }

  async send(
    from: WalletAccount,
    toBech32: string,
    amountUgnot: string,
    _gasFee: string,
    _gasWanted: bigint,
    _memo?: string,
  ): Promise<{ hash?: string; raw?: string }> {
    const amt = Number(amountUgnot);
    const bal = this.balances.get(from.address) ?? 0;
    if (bal < amt) throw new Error('Insufficient funds (mock)');
    this.balances.set(from.address, bal - amt);
    this.balances.set(toBech32, (this.balances.get(toBech32) ?? 0) + amt);
    const hash = `mocktx_${Date.now().toString(16)}`;
    return { hash, raw: `sent ${amt}ugnot on ${this.chainId} via ${this.remote}` };
  }

  async call(
    _from: WalletAccount,
    pkgPath: string,
    func: string,
    args: string[],
    _gasFee: string,
    _gasWanted: bigint,
    _send?: string,
  ): Promise<CallResult> {
    return {
      raw: JSON.stringify({ mock: true, pkgPath, func, args, chainId: this.chainId }, null, 2),
    };
  }
}

// ─── Real gnonative client ───────────────────────────────────────────────────

class NativeGnoClient implements GnoClient {
  readonly isMock = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private gnonative: any) {}

  async setNetwork(remote: string, chainId: string): Promise<void> {
    if (typeof this.gnonative.setRemote === 'function') {
      await this.gnonative.setRemote(remote);
    }
    if (typeof this.gnonative.setChainID === 'function') {
      await this.gnonative.setChainID(chainId);
    }
  }

  async generateRecoveryPhrase(): Promise<string> {
    return this.gnonative.generateRecoveryPhrase();
  }

  async createAccount(name: string, mnemonic: string, password: string): Promise<WalletAccount> {
    const info = await this.gnonative.createAccount(name, mnemonic, password);
    return await this.keyInfoToAccount(info);
  }

  async listAccounts(): Promise<WalletAccount[]> {
    const list = (await this.gnonative.listKeyInfo?.()) ?? [];
    const out: WalletAccount[] = [];
    for (const info of list) {
      out.push(await this.keyInfoToAccount(info));
    }
    return out;
  }

  async hasKeyByName(name: string): Promise<boolean> {
    return Boolean(await this.gnonative.hasKeyByName(name));
  }

  async activateAccount(name: string): Promise<WalletAccount | null> {
    const info = await this.gnonative.activateAccount?.(name);
    if (!info) {
      // Some versions return void; list and find
      const all = await this.listAccounts();
      return all.find((a) => a.name === name) ?? null;
    }
    return this.keyInfoToAccount(info);
  }

  async setPassword(password: string, addressBytes?: Uint8Array): Promise<void> {
    if (addressBytes) {
      await this.gnonative.setPassword(password, addressBytes);
    } else {
      await this.gnonative.setPassword?.(password);
    }
  }

  async deleteAccount(name: string, password?: string): Promise<void> {
    if (typeof this.gnonative.deleteAccount === 'function') {
      await this.gnonative.deleteAccount(name, password ?? '', false);
    }
  }

  async queryBalance(address: string): Promise<BalanceResult> {
    try {
      let addressBytes = address;
      if (typeof this.gnonative.addressFromBech32 === 'function') {
        addressBytes = await this.gnonative.addressFromBech32(address);
      }
      const res = await this.gnonative.queryAccount(addressBytes);
      const coins = res?.accountInfo?.coins ?? res?.account_info?.coins ?? [];
      const ugnotCoin = Array.isArray(coins)
        ? coins.find((c: { denom?: string; amount?: string }) => c.denom === 'ugnot')
        : null;
      const ugnot = ugnotCoin?.amount ?? '0';
      return { ugnot: String(ugnot), unknownAddress: false };
    } catch {
      return { ugnot: '0', unknownAddress: true };
    }
  }

  async send(
    from: WalletAccount,
    toBech32: string,
    amountUgnot: string,
    gasFee: string,
    gasWanted: bigint,
    memo?: string,
  ): Promise<{ hash?: string; raw?: string }> {
    // Prefer dedicated send helpers when present on the native client.
    const amount = `${amountUgnot}ugnot`;
    if (typeof this.gnonative.makeSendTx === 'function') {
      const tx = await this.gnonative.makeSendTx(from.addressBytes ?? from.address, toBech32, amount);
      // signing/broadcast APIs vary by gnonative version — attempt common names
      if (typeof this.gnonative.signAndBroadcast === 'function') {
        const res = await this.gnonative.signAndBroadcast(tx, gasFee, gasWanted);
        return { hash: res?.hash, raw: JSON.stringify(res) };
      }
    }
    if (typeof this.gnonative.send === 'function') {
      const res = await this.gnonative.send(
        toBech32,
        amount,
        gasFee,
        gasWanted,
        from.addressBytes ?? from.address,
        memo ?? '',
      );
      return { hash: res?.hash, raw: JSON.stringify(res) };
    }
    // Fallback: document limitation — caller should upgrade gnonative or use MsgSend via call bridge
    throw new Error(
      'Send API not found on this @gnolang/gnonative version. Update the package or implement makeSendTx wiring. Mock mode supports send for UI testing.',
    );
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
    const chunks: string[] = [];
    const address = from.addressBytes ?? from.address;
    // Signature matches gnoboard: call(pkg, func, args, gasFee, gasWanted, address)
    const stream = await this.gnonative.call(pkgPath, func, args, gasFee, gasWanted, address, send ?? '');
    if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
      for await (const response of stream) {
        const result = response?.result;
        if (result instanceof Uint8Array) {
          chunks.push(new TextDecoder().decode(result));
        } else if (typeof result === 'string') {
          chunks.push(result);
        } else if (result) {
          chunks.push(JSON.stringify(result));
        }
      }
    } else if (stream?.result) {
      chunks.push(String(stream.result));
    }
    return { raw: chunks.join('\n') || 'ok' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async keyInfoToAccount(info: any): Promise<WalletAccount> {
    const name = info?.name ?? info?.Name ?? 'account';
    let address = info?.addressBech32 ?? info?.address_bech32 ?? '';
    const addressBytes: Uint8Array | undefined = info?.address ?? info?.Address;
    if (!address && addressBytes && typeof this.gnonative.addressToBech32 === 'function') {
      address = await this.gnonative.addressToBech32(addressBytes);
    }
    if (!address && typeof addressBytes === 'string') {
      address = addressBytes;
    }
    return { name, address: String(address), addressBytes };
  }
}

export function createMockClient(): GnoClient {
  return new MockGnoClient();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createNativeClient(gnonative: any): GnoClient {
  return new NativeGnoClient(gnonative);
}

/** Pure UI mock with fake g1mock* addresses (only if EXPO_PUBLIC_FORCE_FAKE=1). */
export function shouldUseFakeMock(): boolean {
  return process.env.EXPO_PUBLIC_FORCE_FAKE === '1';
}

export function isWebRuntime(): boolean {
  return typeof document !== 'undefined';
}

export { createWebGnoClient } from './webGnoClient';
export type { WebGnoClient } from './webGnoClient';
