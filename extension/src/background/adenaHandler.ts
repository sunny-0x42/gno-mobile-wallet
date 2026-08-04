import type { AdenaDoContractParams, AdenaResponse } from '@/services/adenaTypes';
import { fetchNativeBalances } from '@/services/rpcBalance';
import type { PendingApproval } from '../shared/messages';
import {
  callRealm,
  currentNetwork,
  getClient,
  getState,
  sendGnot,
  switchNetwork,
  BUILTIN_NETWORKS,
} from './walletCore';

function ok<T>(type: string, message: string, data: T): AdenaResponse<T> {
  return { code: 0, status: 'success', type, message, data };
}

function fail(type: string, message: string, code = 4000): AdenaResponse {
  return { code, status: 'failure', type, message, data: {} };
}

const established = new Set<string>();

type Resolver = {
  resolve: (v: AdenaResponse) => void;
  reject: (e: Error) => void;
  approval: PendingApproval;
};

const pendingResolvers = new Map<string, Resolver>();
let currentApproval: PendingApproval | null = null;

export function getCurrentApproval(): PendingApproval | null {
  return currentApproval;
}

export function resolveApproval(id: string, approved: boolean): void {
  const r = pendingResolvers.get(id);
  if (!r) return;
  pendingResolvers.delete(id);
  if (currentApproval?.id === id) currentApproval = null;
  if (!approved) {
    r.resolve(fail(r.approval.kind === 'establish' ? 'CONNECTION_REJECT' : 'TRANSACTION_FAILED', 'User rejected'));
    return;
  }
  if (r.approval.kind === 'establish') {
    established.add(r.approval.origin);
    r.resolve(ok('CONNECTION_SUCCESS', 'The connection has been established.', {}));
    return;
  }
  // contract — execute after approve
  void executeContract(r.approval.params as unknown as AdenaDoContractParams)
    .then(r.resolve)
    .catch((e) =>
      r.resolve(fail('TRANSACTION_FAILED', e instanceof Error ? e.message : String(e))),
    );
}

function openApprovalWindow(approval: PendingApproval): void {
  currentApproval = approval;
  const url = chrome.runtime.getURL(`approval.html?id=${encodeURIComponent(approval.id)}`);
  chrome.windows.create({
    url,
    type: 'popup',
    width: 400,
    height: 600,
    focused: true,
  });
}

function enqueueApproval(approval: PendingApproval): Promise<AdenaResponse> {
  return new Promise((resolve, reject) => {
    pendingResolvers.set(approval.id, { resolve, reject, approval });
    openApprovalWindow(approval);
  });
}

async function executeContract(params: AdenaDoContractParams): Promise<AdenaResponse> {
  const state = await getState();
  if (!state.activeAccount) {
    return fail('TRANSACTION_FAILED', 'No wallet account');
  }
  if (!state.unlocked) {
    return fail('TRANSACTION_FAILED', 'Wallet locked — unlock in extension popup first', 1001);
  }

  const messages = params.messages?.length ? params.messages : params.tx?.messages ?? [];
  if (!messages.length) return fail('TRANSACTION_FAILED', 'No messages in transaction');

  let lastHash = '';
  for (const msg of messages) {
    const t = msg.type || '';
    const v = msg.value || {};
    if (t.includes('MsgSend') || t === '/bank.MsgSend') {
      const to = String(v.to_address || v.toAddress || '');
      const amountStr = String(v.amount || '');
      const m = amountStr.match(/^(\d+)ugnot$/i);
      if (!to || !m) return fail('TRANSACTION_FAILED', `Unsupported send amount: ${amountStr}`);
      const gnot = (Number(m[1]) / 1_000_000).toString();
      const res = await sendGnot(to, gnot, params.memo);
      lastHash = res.hash || '';
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
      if (!pkg || !func) return fail('TRANSACTION_FAILED', 'Missing pkg_path or func');
      const res = await callRealm(pkg, func, args, sendUgnot);
      lastHash = '';
      void res;
    } else {
      return fail('TRANSACTION_FAILED', `Message type not supported: ${t}`);
    }
  }

  return ok('TRANSACTION_SENT', 'The transaction has been successfully sent.', {
    hash: lastHash,
    height: '',
    deliverTx: {},
    checkTx: {},
  });
}

function summarizeContract(params: AdenaDoContractParams): string {
  const messages = params.messages?.length ? params.messages : params.tx?.messages ?? [];
  return messages
    .map((m) => {
      const t = m.type || 'msg';
      const v = m.value || {};
      if (t.includes('MsgSend')) return `Send ${v.amount || '?'} → ${v.to_address || v.toAddress || '?'}`;
      if (t.includes('m_call') || t.includes('MsgCall'))
        return `Call ${v.func || v.function} @ ${v.pkg_path || v.pkgPath}`;
      return t;
    })
    .join('\n');
}

export async function handleAdenaMethod(
  method: string,
  params: Record<string, unknown>,
  origin: string,
): Promise<AdenaResponse> {
  try {
    switch (method) {
      case 'AddEstablish':
      case 'addEstablish': {
        if (established.has(origin)) {
          return ok('CONNECTION_SUCCESS', 'Already connected.', {});
        }
        const siteName = String(params.name || 'dApp');
        return await enqueueApproval({
          id: `est_${Date.now()}`,
          kind: 'establish',
          origin,
          siteName,
        });
      }
      case 'IsConnected':
      case 'isConnected': {
        return ok('GET_CONNECTION', '', { connected: established.has(origin) });
      }
      case 'GetAccount':
      case 'getAccount': {
        const state = await getState();
        if (!state.activeAccount) {
          return fail('GET_ACCOUNT', 'No account', 4000);
        }
        if (!established.has(origin)) {
          return fail('GET_ACCOUNT', 'Not connected — call AddEstablish first', 4000);
        }
        const net = currentNetwork();
        let coins = '0ugnot';
        try {
          const bal = await fetchNativeBalances(net.remote, state.activeAccount.address);
          const ug = bal.find((c) => c.denom === 'ugnot');
          if (ug) coins = `${ug.amount}ugnot`;
        } catch {
          /* ignore */
        }
        return ok('GET_ACCOUNT', '', {
          status: state.unlocked ? 'ACTIVE' : 'IN_ACTIVE',
          address: state.activeAccount.address,
          coins,
          account_number: '0',
          sequence: '0',
          chainId: net.chainId,
        });
      }
      case 'GetNetwork':
      case 'getNetwork': {
        const net = currentNetwork();
        return ok('GET_NETWORK', '', {
          chainId: net.chainId,
          networkName: net.name,
          rpcUrl: net.remote,
          addressPrefix: 'g',
        });
      }
      case 'DoContract':
      case 'doContract': {
        if (!established.has(origin)) {
          return fail('TRANSACTION_FAILED', 'Not connected');
        }
        const p = params as unknown as AdenaDoContractParams;
        return await enqueueApproval({
          id: `tx_${Date.now()}`,
          kind: 'contract',
          origin,
          summary: summarizeContract(p),
          params: params,
        });
      }
      case 'SwitchNetwork':
      case 'switchNetwork': {
        const chainId = String(params.chainId || params.chain_id || '');
        const net = BUILTIN_NETWORKS.find((n) => n.chainId === chainId || n.id === chainId);
        if (!net) return fail('SWITCH_NETWORK', `Unknown network: ${chainId}`);
        await switchNetwork(net.id);
        return ok('SWITCH_NETWORK', 'Network switched', {
          chainId: net.chainId,
          networkName: net.name,
          rpcUrl: net.remote,
        });
      }
      case 'SignAmino':
        return fail('SIGN_AMINO', 'SignAmino not supported yet — use DoContract');
      case 'AddNetwork':
        return fail('ADD_NETWORK', 'AddNetwork not supported in extension yet');
      default:
        return fail('UNKNOWN', `Method not supported: ${method}`);
    }
  } catch (e) {
    return fail('ERROR', e instanceof Error ? e.message : String(e));
  }
}

// keep client reference for future
void getClient;
