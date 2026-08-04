/**
 * Hosts Adena-compatible connection/signing prompts and executes them
 * against the in-app wallet (WebGnoClient / gnonative).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { useWallet } from '@/provider/WalletProvider';
import type {
  AdenaDoContractParams,
  AdenaPendingRequest,
  AdenaResponse,
} from '@/services/adenaTypes';
import { fetchNativeBalances } from '@/services/rpcBalance';
import { colors, spacing, typography } from '@/theme';

type AdenaHostApi = {
  /** Handle a method from injected script / window.adena */
  handleMethod: (
    method: string,
    params: Record<string, unknown>,
    origin: string,
  ) => Promise<AdenaResponse>;
  establishedOrigins: string[];
};

const AdenaHostContext = createContext<AdenaHostApi | null>(null);

function ok<T>(type: string, message: string, data: T): AdenaResponse<T> {
  return { code: 0, status: 'success', type, message, data };
}

function fail(type: string, message: string, code = 4000): AdenaResponse {
  return { code, status: 'failure', type, message, data: {} };
}

export function AdenaHostProvider({ children }: { children: React.ReactNode }) {
  const {
    activeAccount,
    network,
    isUnlocked,
    sendGnot,
    callRealm,
    switchNetwork,
    networks,
    client,
  } = useWallet();

  const [pending, setPending] = useState<AdenaPendingRequest | null>(null);
  const established = useRef<Set<string>>(new Set());
  const [establishedList, setEstablishedList] = useState<string[]>([]);

  const requireAccount = useCallback(() => {
    if (!activeAccount) throw new Error('No wallet account. Create or import a wallet first.');
    return activeAccount;
  }, [activeAccount]);

  const enqueueEstablish = useCallback(
    (siteName: string, origin: string) =>
      new Promise<AdenaResponse>((resolve, reject) => {
        const id = `est_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setPending({
          id,
          kind: 'establish',
          siteName,
          origin,
          resolve,
          reject,
        });
      }),
    [],
  );

  const enqueueContract = useCallback(
    (params: AdenaDoContractParams, origin: string) =>
      new Promise<AdenaResponse>((resolve, reject) => {
        const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setPending({
          id,
          kind: 'contract',
          origin,
          params,
          resolve,
          reject,
        });
      }),
    [],
  );

  const enqueueSwitchNetwork = useCallback(
    (networkId: string, chainId: string, networkName: string, origin: string) =>
      new Promise<AdenaResponse>((resolve, reject) => {
        const id = `net_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setPending({
          id,
          kind: 'switch-network',
          origin,
          networkId,
          chainId,
          networkName,
          resolve,
          reject,
        });
      }),
    [],
  );

  const executeContract = useCallback(
    async (params: AdenaDoContractParams): Promise<AdenaResponse> => {
      const account = requireAccount();
      if (!isUnlocked && !client.isMock) {
        return fail(
          'TRANSACTION_FAILED',
          'Wallet is locked. Unlock in Settings before approving dApp transactions.',
          1001,
        );
      }

      const messages = params.messages?.length
        ? params.messages
        : params.tx?.messages ?? [];
      if (!messages.length) {
        return fail('TRANSACTION_FAILED', 'No messages in transaction');
      }

      let lastHash: string | undefined;
      for (const msg of messages) {
        const t = msg.type || '';
        const v = msg.value || {};

        if (t.includes('MsgSend') || t === '/bank.MsgSend') {
          const to = String(v.to_address || v.toAddress || '');
          const amountStr = String(v.amount || '');
          const m = amountStr.match(/^(\d+)ugnot$/i);
          if (!to || !m) {
            return fail('TRANSACTION_FAILED', `Unsupported send amount: ${amountStr}`);
          }
          const gnot = (Number(m[1]) / 1_000_000).toString();
          const rec = await sendGnot(to, gnot, params.memo);
          if (rec.status !== 'success') {
            return fail('TRANSACTION_FAILED', rec.error || 'Send failed');
          }
          lastHash = rec.hash;
        } else if (t.includes('m_call') || t.includes('MsgCall') || t === '/vm.m_call') {
          const pkg = String(v.pkg_path || v.pkgPath || '');
          const func = String(v.func || v.function || '');
          const args = Array.isArray(v.args) ? v.args.map(String) : [];
          const send = v.send ? String(v.send) : undefined;
          let sendUgnot: string | undefined;
          if (send) {
            const sm = send.match(/^(\d+)ugnot$/i);
            if (sm) sendUgnot = sm[1];
          }
          if (!pkg || !func) {
            return fail('TRANSACTION_FAILED', 'Missing pkg_path or func');
          }
          const res = await callRealm(pkg, func, args, sendUgnot);
          lastHash = res.record.hash;
        } else {
          return fail(
            'TRANSACTION_FAILED',
            `Message type not supported yet: ${t}`,
          );
        }
      }

      return ok('TRANSACTION_SENT', 'The transaction has been successfully sent.', {
        hash: lastHash || '',
        height: '',
        deliverTx: {},
        checkTx: {},
      });
    },
    [callRealm, client.isMock, isUnlocked, requireAccount, sendGnot],
  );

  const handleMethod = useCallback(
    async (
      method: string,
      params: Record<string, unknown>,
      origin: string,
    ): Promise<AdenaResponse> => {
      try {
        switch (method) {
          case 'AddEstablish': {
            const name = String(params.name || 'dApp');
            if (established.current.has(origin)) {
              return ok('CONNECTION_SUCCESS', 'Already connected.', {});
            }
            return await enqueueEstablish(name, origin);
          }
          case 'IsConnected': {
            const connected = established.current.has(origin);
            return ok('GET_CONNECTION', 'Connection state.', {
              status: connected ? 'connected' : 'disconnected',
            });
          }
          case 'GetAccount': {
            if (!established.current.has(origin)) {
              return fail('NOT_CONNECTED', 'Establish a connection first.', 1000);
            }
            const account = requireAccount();
            let coins = '0ugnot';
            try {
              const bals = await fetchNativeBalances(network.remote, account.address);
              const ug = bals.find((c) => c.denom === 'ugnot');
              coins = ug ? `${ug.amount}ugnot` : bals.map((c) => `${c.amount}${c.denom}`).join(',') || '0ugnot';
            } catch {
              /* ignore */
            }
            return ok('GET_ACCOUNT', 'Get account.', {
              status: 'ACTIVE',
              address: account.address,
              coins,
              account_number: '0',
              sequence: '0',
              chainId: network.chainId,
            });
          }
          case 'GetNetwork': {
            return ok('GET_NETWORK', 'Get network.', {
              chainId: network.chainId,
              networkName: network.name,
              rpcUrl: network.remote,
              addressPrefix: 'g',
            });
          }
          case 'SwitchNetwork': {
            const chainId = String(params.chainId || params.chain_id || '');
            const match = networks.find((n) => n.chainId === chainId || n.id === chainId);
            if (!match) {
              return fail('SWITCH_NETWORK_FAILED', `Unknown network: ${chainId}`);
            }
            // P0: never silent-switch — user must approve
            if (match.id === network.id) {
              return ok('SWITCH_NETWORK_SUCCESS', 'Already on this network.', {
                chainId: match.chainId,
              });
            }
            return await enqueueSwitchNetwork(match.id, match.chainId, match.name, origin);
          }
          case 'DoContract': {
            if (!established.current.has(origin)) {
              return fail('NOT_CONNECTED', 'Establish a connection first.', 1000);
            }
            const p = params as unknown as AdenaDoContractParams;
            return await enqueueContract(p, origin);
          }
          case 'AddNetwork': {
            return fail('NOT_SUPPORTED', 'AddNetwork is not implemented in this wallet yet.');
          }
          case 'SignAmino': {
            return fail('NOT_SUPPORTED', 'SignAmino is not implemented; use DoContract.');
          }
          default:
            return fail('UNKNOWN_METHOD', `Unknown method: ${method}`);
        }
      } catch (e) {
        return fail('ERROR', e instanceof Error ? e.message : String(e));
      }
    },
    [
      enqueueContract,
      enqueueEstablish,
      enqueueSwitchNetwork,
      network,
      networks,
      requireAccount,
    ],
  );

  const onApprove = async () => {
    if (!pending) return;
    const req = pending;
    setPending(null);
    if (req.kind === 'establish') {
      established.current.add(req.origin);
      setEstablishedList(Array.from(established.current));
      req.resolve(
        ok('CONNECTION_SUCCESS', 'The connection has been successfully established.', {}),
      );
      return;
    }
    if (req.kind === 'switch-network') {
      try {
        await switchNetwork(req.networkId);
        req.resolve(
          ok('SWITCH_NETWORK_SUCCESS', 'Network switched.', { chainId: req.chainId }),
        );
      } catch (e) {
        req.resolve(
          fail('SWITCH_NETWORK_FAILED', e instanceof Error ? e.message : String(e)),
        );
      }
      return;
    }
    try {
      const result = await executeContract(req.params);
      req.resolve(result);
    } catch (e) {
      req.resolve(fail('TRANSACTION_FAILED', e instanceof Error ? e.message : String(e)));
    }
  };

  const onReject = async () => {
    if (!pending) return;
    const req = pending;
    setPending(null);
    if (req.kind === 'establish') {
      req.resolve(fail('CONNECTION_REJECTED', 'User rejected the connection.', 4001));
    } else if (req.kind === 'switch-network') {
      req.resolve(fail('SWITCH_NETWORK_REJECTED', 'User rejected network switch.', 4001));
    } else {
      req.resolve(fail('TRANSACTION_REJECTED', 'User rejected the transaction.', 4001));
    }
  };

  const api = useMemo<AdenaHostApi>(
    () => ({
      handleMethod,
      establishedOrigins: establishedList,
    }),
    [establishedList, handleMethod],
  );

  return (
    <AdenaHostContext.Provider value={api}>
      {children}
      <Modal visible={!!pending} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>
              {pending?.kind === 'establish'
                ? 'Connect dApp'
                : pending?.kind === 'switch-network'
                  ? 'Switch network'
                  : 'Approve transaction'}
            </Text>
            {pending?.kind === 'establish' ? (
              <>
                <Text style={styles.body}>
                  <Text style={styles.bold}>{pending.siteName}</Text>
                  {' wants to connect to your wallet.'}
                </Text>
                <Text style={styles.meta}>Origin: {pending.origin}</Text>
                <Text style={styles.meta}>
                  Account: {activeAccount?.address ?? '(none)'}
                </Text>
                <Text style={styles.meta}>
                  Network: {network.name} ({network.chainId})
                </Text>
              </>
            ) : pending?.kind === 'switch-network' ? (
              <>
                <Text style={styles.body}>
                  This site wants to change your active network.
                </Text>
                <Text style={styles.meta}>Origin: {pending.origin}</Text>
                <Text style={styles.meta}>
                  Current: {network.name} ({network.chainId})
                </Text>
                <Text style={styles.meta}>
                  Requested: {pending.networkName} ({pending.chainId})
                </Text>
              </>
            ) : pending?.kind === 'contract' ? (
              <>
                <Text style={styles.body}>Review and approve this transaction from the dApp.</Text>
                <Text style={styles.meta}>Origin: {pending.origin}</Text>
                <Text style={styles.meta}>
                  Network: {network.name} ({network.chainId})
                </Text>
                {pending.params.gasFee != null || pending.params.gasWanted != null ? (
                  <Text style={styles.meta}>
                    Gas: wanted {String(pending.params.gasWanted ?? '—')} · fee{' '}
                    {String(pending.params.gasFee ?? '—')}
                  </Text>
                ) : null}
                <ScrollView style={styles.txBox}>
                  <Text style={styles.txJson}>
                    {JSON.stringify(
                      pending.params.messages || pending.params.tx?.messages,
                      null,
                      2,
                    )}
                  </Text>
                </ScrollView>
                {!isUnlocked && !client.isMock ? (
                  <Text style={styles.warn}>
                    Wallet locked — unlock in Settings if approval fails.
                  </Text>
                ) : null}
              </>
            ) : null}
            <View style={styles.actions}>
              <Button title="Reject" variant="danger" onPress={onReject} />
              <Button title="Approve" onPress={onApprove} />
            </View>
          </View>
        </View>
      </Modal>
    </AdenaHostContext.Provider>
  );
}

export function useAdenaHost(): AdenaHostApi {
  const ctx = useContext(AdenaHostContext);
  if (!ctx) throw new Error('useAdenaHost requires AdenaHostProvider');
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  title: { ...typography.title2, marginBottom: 8 },
  body: { ...typography.subhead, marginBottom: 8, color: colors.text },
  bold: { fontWeight: '700', color: colors.text },
  meta: { ...typography.footnote, marginTop: 4, color: colors.textSecondary },
  txBox: {
    maxHeight: 220,
    marginTop: 12,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 12,
  },
  txJson: { ...typography.mono, fontSize: 11, color: colors.textSecondary },
  warn: { ...typography.caption1, color: colors.orange, marginTop: 8 },
  actions: { marginTop: 16 },
});
