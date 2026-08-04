/**
 * Extension wallet core — wraps WebGnoClient with chrome.storage.
 */
import { Buffer } from 'buffer';

// Ensure Buffer for gno-js-client in service worker
const g = globalThis as unknown as { Buffer?: typeof Buffer };
if (!g.Buffer) g.Buffer = Buffer;

import { BUILTIN_NETWORKS, DEFAULT_GAS, DEFAULT_NETWORK_ID } from '@/config/networks';
import { WebGnoClient } from '@/services/webGnoClient';
import { fetchAllBalances } from '@/services/rpcBalance';
import { storage } from '@/services/storage';
import { createChromeStoragePort, setStoragePort } from '@/services/storagePort';
import { gnotToUgnot } from '@/utils/format';
import type { ExtState } from '../shared/messages';

setStoragePort(createChromeStoragePort());

const client = new WebGnoClient();

let networkId = DEFAULT_NETWORK_ID;
let ugnotCache = '0';
let coinsCache: ExtState['coins'] = [];

function currentNetwork() {
  return (
    BUILTIN_NETWORKS.find((n) => n.id === networkId) ??
    BUILTIN_NETWORKS.find((n) => n.id === DEFAULT_NETWORK_ID)!
  );
}

export async function initCore(): Promise<void> {
  const saved = await storage.getNetworkId();
  if (saved && BUILTIN_NETWORKS.some((n) => n.id === saved)) networkId = saved;
  const net = currentNetwork();
  await client.setNetwork(net.remote, net.chainId);
  const activeName = await storage.getActiveAccountName();
  if (activeName) {
    try {
      await client.activateAccount(activeName);
    } catch {
      /* locked is fine */
    }
  }
}

export async function getState(): Promise<ExtState> {
  const accounts = await client.listAccounts();
  const activeName = await storage.getActiveAccountName();
  const active = accounts.find((a) => a.name === activeName) ?? accounts[0] ?? null;
  const unlocked = active ? client.isUnlocked(active.name) : false;
  const net = currentNetwork();

  if (active && unlocked) {
    try {
      const snap = await fetchAllBalances(net.remote, active.address, net.chainId, [], {
        includeZeroGrc20: false,
      });
      ugnotCache = snap.ugnot;
      coinsCache = snap.coins.map((c) => ({
        symbol: c.symbol,
        display: c.display,
        amount: c.amount,
        kind: c.kind,
      }));
    } catch {
      /* keep cache */
    }
  }

  return {
    ready: true,
    hasVault: accounts.length > 0,
    unlocked,
    activeAccount: active ? { name: active.name, address: active.address } : null,
    network: {
      id: net.id,
      name: net.name,
      chainId: net.chainId,
      remote: net.remote,
      isTestnet: net.isTestnet,
    },
    accounts: accounts.map((a) => ({ name: a.name, address: a.address })),
    ugnot: ugnotCache,
    coins: coinsCache,
  };
}

export async function createWallet(name: string, password: string) {
  const phrase = await client.generateRecoveryPhrase();
  const acc = await client.createAccount(name.trim() || 'main', phrase, password);
  await storage.setActiveAccountName(acc.name);
  await storage.setOnboarded(true);
  return { account: acc, phrase };
}

export async function importWallet(name: string, mnemonic: string, password: string) {
  const acc = await client.createAccount(name.trim() || 'imported', mnemonic, password);
  await storage.setActiveAccountName(acc.name);
  await storage.setOnboarded(true);
  return acc;
}

export async function unlock(name: string, password: string) {
  const acc = await client.unlockAccount(name, password);
  await storage.setActiveAccountName(acc.name);
  return acc;
}

export function lock() {
  // WebGnoClient has no explicit lock-all; drop sessions by recreating client state
  // Sessions are in-memory Map — service worker restart clears them.
  // Soft-lock: mark by clearing via re-init pattern — not exposing passwords.
  // Best effort: user closes browser; for soft lock we just report locked by not calling unlock.
}

export async function sendGnot(to: string, amountGnot: string, memo?: string) {
  const state = await getState();
  if (!state.activeAccount) throw new Error('No account');
  if (!state.unlocked) throw new Error('Wallet locked');
  const from = (await client.listAccounts()).find((a) => a.name === state.activeAccount!.name);
  if (!from) throw new Error('Account missing');
  const ugnot = gnotToUgnot(amountGnot);
  return client.send(
    from,
    to.trim(),
    ugnot,
    DEFAULT_GAS.sendFee,
    DEFAULT_GAS.sendGasWanted,
    memo,
  );
}

export async function callRealm(
  pkgPath: string,
  func: string,
  args: string[],
  sendUgnot?: string,
) {
  const state = await getState();
  if (!state.activeAccount) throw new Error('No account');
  if (!state.unlocked) throw new Error('Wallet locked');
  const from = (await client.listAccounts()).find((a) => a.name === state.activeAccount!.name);
  if (!from) throw new Error('Account missing');
  return client.call(
    from,
    pkgPath,
    func,
    args,
    DEFAULT_GAS.callFee,
    DEFAULT_GAS.callGasWanted,
    sendUgnot ? `${sendUgnot}ugnot` : undefined,
  );
}

export async function switchNetwork(id: string) {
  const net = BUILTIN_NETWORKS.find((n) => n.id === id);
  if (!net) throw new Error('Unknown network');
  networkId = id;
  await storage.setNetworkId(id);
  await client.setNetwork(net.remote, net.chainId);
  return net;
}

export async function setActive(name: string) {
  await client.activateAccount(name);
  await storage.setActiveAccountName(name);
}

export function getClient() {
  return client;
}

export { currentNetwork, BUILTIN_NETWORKS };
