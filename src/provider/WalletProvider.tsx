import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  BUILTIN_NETWORKS,
  DEFAULT_GAS,
  DEFAULT_NETWORK_ID,
  type NetworkConfig,
} from '@/config/networks';
import {
  createMockClient,
  createNativeClient,
  createWebGnoClient,
  isWebRuntime,
  shouldUseFakeMock,
  type GnoClient,
  type WebGnoClient,
} from '@/services/gnoClient';
import { storage } from '@/services/storage';
import type { CustomToken, LocalTxRecord, WalletAccount } from '@/types';
import { gnotToUgnot } from '@/utils/format';

function createBootClient(): GnoClient {
  if (shouldUseFakeMock()) return createMockClient();
  if (isWebRuntime()) return createWebGnoClient();
  // Native: start mock until gnonative attaches
  return createMockClient();
}

type WalletContextValue = {
  ready: boolean;
  client: GnoClient;
  /** True only for pure UI mock (g1mock*). Web real client is false. */
  isMock: boolean;
  /** Web client unlocked for signing */
  isUnlocked: boolean;
  accounts: WalletAccount[];
  activeAccount: WalletAccount | null;
  network: NetworkConfig;
  networks: NetworkConfig[];
  history: LocalTxRecord[];
  tokens: CustomToken[];
  refreshAccounts: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  setActiveAccountByName: (name: string) => Promise<void>;
  switchNetwork: (id: string) => Promise<void>;
  addCustomNetwork: (n: NetworkConfig) => Promise<void>;
  createAccount: (name: string, mnemonic: string, password: string) => Promise<WalletAccount>;
  importAccount: (name: string, mnemonic: string, password: string) => Promise<WalletAccount>;
  generatePhrase: () => Promise<string>;
  unlockAccount: (name: string, password: string) => Promise<void>;
  sendGnot: (to: string, amountGnot: string, memo?: string) => Promise<LocalTxRecord>;
  callRealm: (
    pkgPath: string,
    func: string,
    args: string[],
    sendUgnot?: string,
    gasOpts?: { gasFee?: string; gasWanted?: bigint },
  ) => Promise<{ result: string; record: LocalTxRecord }>;
  addToken: (token: CustomToken) => Promise<void>;
  removeToken: (id: string) => Promise<void>;
  removeAccount: (name: string) => Promise<void>;
  /** Inject real gnonative instance after native module loads */
  attachNativeGnonative: (gnonative: unknown) => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<GnoClient>(() => createBootClient());
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<WalletAccount | null>(null);
  const [network, setNetwork] = useState<NetworkConfig>(
    BUILTIN_NETWORKS.find((n) => n.id === DEFAULT_NETWORK_ID)!,
  );
  const [customNetworks, setCustomNetworks] = useState<NetworkConfig[]>([]);
  const [history, setHistory] = useState<LocalTxRecord[]>([]);
  const [tokens, setTokens] = useState<CustomToken[]>([]);
  const [unlockedTick, setUnlockedTick] = useState(0);

  const networks = useMemo(
    () => [...BUILTIN_NETWORKS, ...customNetworks],
    [customNetworks],
  );

  const isUnlocked = useMemo(() => {
    void unlockedTick;
    const c = client as WebGnoClient;
    if (typeof c.isUnlocked === 'function') {
      if (!activeAccount) return false;
      return c.isUnlocked(activeAccount.name);
    }
    // Mock / native: treat as unlocked once an account is selected
    return !!activeAccount;
  }, [client, activeAccount, unlockedTick]);

  const bootstrap = useCallback(async (c: GnoClient) => {
    const netId = (await storage.getNetworkId()) ?? DEFAULT_NETWORK_ID;
    const customs = await storage.getCustomNetworks();
    setCustomNetworks(customs);
    const all = [...BUILTIN_NETWORKS, ...customs];
    const net = all.find((n) => n.id === netId) ?? BUILTIN_NETWORKS[0];
    setNetwork(net);
    await c.setNetwork(net.remote, net.chainId);

    const list = await c.listAccounts();
    setAccounts(list);
    const activeName = await storage.getActiveAccountName();
    const active =
      list.find((a) => a.name === activeName) ?? list[0] ?? null;
    if (active) {
      await c.activateAccount(active.name);
      setActiveAccount(active);
    }
    setHistory(await storage.getHistory());
    setTokens(await storage.getTokens());
    setReady(true);
  }, []);

  useEffect(() => {
    const c = createBootClient();
    setClient(c);
    bootstrap(c);
  }, [bootstrap]);

  const attachNativeGnonative = useCallback(
    (gnonative: unknown) => {
      if (isWebRuntime() || shouldUseFakeMock()) return;
      const c = createNativeClient(gnonative);
      setClient(c);
      setReady(false);
      bootstrap(c);
    },
    [bootstrap],
  );

  const refreshAccounts = useCallback(async () => {
    const list = await client.listAccounts();
    setAccounts(list);
  }, [client]);

  const refreshHistory = useCallback(async () => {
    setHistory(await storage.getHistory());
  }, []);

  const setActiveAccountByName = useCallback(
    async (name: string) => {
      const acc = await client.activateAccount(name);
      if (acc) {
        setActiveAccount(acc);
        await storage.setActiveAccountName(name);
      }
    },
    [client],
  );

  const switchNetwork = useCallback(
    async (id: string) => {
      const net = networks.find((n) => n.id === id);
      if (!net) return;
      await client.setNetwork(net.remote, net.chainId);
      setNetwork(net);
      await storage.setNetworkId(id);
    },
    [client, networks],
  );

  const addCustomNetwork = useCallback(async (n: NetworkConfig) => {
    const next = [...(await storage.getCustomNetworks()).filter((x) => x.id !== n.id), n];
    await storage.setCustomNetworks(next);
    setCustomNetworks(next);
  }, []);

  const createAccount = useCallback(
    async (name: string, mnemonic: string, password: string) => {
      const acc = await client.createAccount(name, mnemonic, password);
      await client.activateAccount(name);
      await client.setPassword(password, acc.addressBytes);
      await storage.setActiveAccountName(name);
      await storage.setOnboarded(true);
      setActiveAccount(acc);
      setUnlockedTick((t) => t + 1);
      await refreshAccounts();
      return acc;
    },
    [client, refreshAccounts],
  );

  const importAccount = createAccount;

  const generatePhrase = useCallback(async () => client.generateRecoveryPhrase(), [client]);

  const unlockAccount = useCallback(
    async (name: string, password: string) => {
      const c = client as WebGnoClient;
      if (typeof c.unlockAccount !== 'function') {
        await client.activateAccount(name);
        return;
      }
      const acc = await c.unlockAccount(name, password);
      setActiveAccount(acc);
      await storage.setActiveAccountName(name);
      setUnlockedTick((t) => t + 1);
    },
    [client],
  );

  const sendGnot = useCallback(
    async (to: string, amountGnot: string, memo?: string) => {
      if (!activeAccount) throw new Error('No active account');
      const ugnot = gnotToUgnot(amountGnot);
      const id = `tx_${Date.now()}`;
      const record: LocalTxRecord = {
        id,
        type: 'send',
        status: 'pending',
        from: activeAccount.address,
        to,
        amount: `${ugnot}ugnot`,
        memo,
        networkId: network.id,
        chainId: network.chainId,
        createdAt: Date.now(),
      };
      await storage.pushHistory(record);
      setHistory(await storage.getHistory());
      try {
        const res = await client.send(
          activeAccount,
          to.trim(),
          ugnot,
          DEFAULT_GAS.sendFee,
          DEFAULT_GAS.sendGasWanted,
          memo,
        );
        await storage.updateHistory(id, { status: 'success', hash: res.hash });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await storage.updateHistory(id, { status: 'failed', error: msg });
        setHistory(await storage.getHistory());
        throw e;
      }
      const updated = await storage.getHistory();
      setHistory(updated);
      return updated.find((t) => t.id === id)!;
    },
    [activeAccount, client, network],
  );

  const callRealm = useCallback(
    async (
      pkgPath: string,
      func: string,
      args: string[],
      sendUgnot?: string,
      gasOpts?: { gasFee?: string; gasWanted?: bigint },
    ) => {
      if (!activeAccount) throw new Error('No active account');
      const gasFee = gasOpts?.gasFee ?? DEFAULT_GAS.callFee;
      const gasWanted = gasOpts?.gasWanted ?? DEFAULT_GAS.callGasWanted;
      const id = `tx_${Date.now()}`;
      const record: LocalTxRecord = {
        id,
        type: 'call',
        status: 'pending',
        from: activeAccount.address,
        pkgPath,
        func,
        amount: sendUgnot ? `${sendUgnot}ugnot` : undefined,
        networkId: network.id,
        chainId: network.chainId,
        createdAt: Date.now(),
      };
      await storage.pushHistory(record);
      try {
        const res = await client.call(
          activeAccount,
          pkgPath,
          func,
          args,
          gasFee,
          gasWanted,
          sendUgnot ? `${sendUgnot}ugnot` : undefined,
        );
        await storage.updateHistory(id, { status: 'success' });
        const updated = await storage.getHistory();
        setHistory(updated);
        return { result: res.raw, record: updated.find((t) => t.id === id)! };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const hint =
          /out of gas/i.test(msg)
            ? ` (gas_wanted=${gasWanted.toString()} may be too low for this call — try again or raise swap gas)`
            : '';
        const full = msg + hint;
        await storage.updateHistory(id, { status: 'failed', error: full });
        setHistory(await storage.getHistory());
        throw new Error(full);
      }
    },
    [activeAccount, client, network],
  );

  const addToken = useCallback(async (token: CustomToken) => {
    const list = await storage.getTokens();
    const next = [...list.filter((t) => t.id !== token.id), token];
    await storage.setTokens(next);
    setTokens(next);
  }, []);

  const removeToken = useCallback(async (id: string) => {
    const next = (await storage.getTokens()).filter((t) => t.id !== id);
    await storage.setTokens(next);
    setTokens(next);
  }, []);

  const removeAccount = useCallback(
    async (name: string) => {
      await client.deleteAccount(name);
      if (activeAccount?.name === name) {
        setActiveAccount(null);
      }
      await refreshAccounts();
    },
    [activeAccount, client, refreshAccounts],
  );

  const value: WalletContextValue = {
    ready,
    client,
    isMock: client.isMock,
    isUnlocked,
    accounts,
    activeAccount,
    network,
    networks,
    history,
    tokens,
    refreshAccounts,
    refreshHistory,
    setActiveAccountByName,
    switchNetwork,
    addCustomNetwork,
    createAccount,
    importAccount,
    generatePhrase,
    unlockAccount,
    sendGnot,
    callRealm,
    addToken,
    removeToken,
    removeAccount,
    attachNativeGnonative,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
