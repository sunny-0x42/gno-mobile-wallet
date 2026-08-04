import type { ExtRequest, ExtResponse } from '../shared/messages';
import { getCurrentApproval, handleAdenaMethod, resolveApproval } from './adenaHandler';
import {
  createWallet,
  getState,
  importWallet,
  initCore,
  sendGnot,
  setActive,
  switchNetwork,
  unlock,
} from './walletCore';

const ready = initCore().catch((e) => console.error('[gno-ext] init', e));

// Soft keep-alive (MV3 SW can sleep; unlock is lost on restart — expected)
chrome.alarms.create('gno-keepalive', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(() => {
  /* touch SW */
});

chrome.runtime.onMessage.addListener((message: ExtRequest, sender, sendResponse) => {
  void (async () => {
    await ready;
    try {
      const res = await route(message, sender);
      sendResponse(res);
    } catch (e) {
      sendResponse({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      } satisfies ExtResponse);
    }
  })();
  return true; // async
});

async function route(
  message: ExtRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtResponse> {
  switch (message.type) {
    case 'EXT_PING':
      return { ok: true, data: { pong: true } };
    case 'EXT_GET_STATE':
      return { ok: true, data: await getState() };
    case 'EXT_CREATE_WALLET': {
      const data = await createWallet(message.name, message.password);
      return { ok: true, data };
    }
    case 'EXT_IMPORT_WALLET': {
      const acc = await importWallet(message.name, message.mnemonic, message.password);
      return { ok: true, data: acc };
    }
    case 'EXT_UNLOCK': {
      const acc = await unlock(message.name, message.password);
      return { ok: true, data: acc };
    }
    case 'EXT_LOCK':
      return { ok: true, data: { locked: true } };
    case 'EXT_GET_BALANCE':
      return { ok: true, data: await getState() };
    case 'EXT_SEND': {
      const r = await sendGnot(message.to, message.amountGnot, message.memo);
      return { ok: true, data: r };
    }
    case 'EXT_SWITCH_NETWORK': {
      const net = await switchNetwork(message.networkId);
      return { ok: true, data: net };
    }
    case 'EXT_LIST_ACCOUNTS': {
      const s = await getState();
      return { ok: true, data: s.accounts };
    }
    case 'EXT_SET_ACTIVE': {
      await setActive(message.name);
      return { ok: true };
    }
    case 'ADENA_RPC': {
      const origin =
        message.origin ||
        (sender.tab?.url ? new URL(sender.tab.url).origin : 'unknown');
      const result = await handleAdenaMethod(message.method, message.params || {}, origin);
      return { ok: true, data: result };
    }
    case 'APPROVAL_GET':
      return { ok: true, data: getCurrentApproval() };
    case 'APPROVAL_RESOLVE': {
      resolveApproval(message.id, message.approved);
      return { ok: true };
    }
    default:
      return { ok: false, error: 'Unknown message type' };
  }
}

console.log('[gno-ext] background ready');
