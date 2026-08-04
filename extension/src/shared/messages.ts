/** Message protocol between popup / content / background / approval. */

export type ExtRequest =
  | { type: 'EXT_PING' }
  | { type: 'EXT_GET_STATE' }
  | { type: 'EXT_CREATE_WALLET'; name: string; password: string }
  | { type: 'EXT_IMPORT_WALLET'; name: string; mnemonic: string; password: string }
  | { type: 'EXT_UNLOCK'; name: string; password: string }
  | { type: 'EXT_LOCK' }
  | { type: 'EXT_GET_BALANCE' }
  | { type: 'EXT_SEND'; to: string; amountGnot: string; memo?: string }
  | { type: 'EXT_SWITCH_NETWORK'; networkId: string }
  | { type: 'EXT_LIST_ACCOUNTS' }
  | { type: 'EXT_SET_ACTIVE'; name: string }
  | { type: 'ADENA_RPC'; id: string; method: string; params: Record<string, unknown>; origin: string }
  | { type: 'APPROVAL_GET' }
  | { type: 'APPROVAL_RESOLVE'; id: string; approved: boolean };

export type ExtState = {
  ready: boolean;
  hasVault: boolean;
  unlocked: boolean;
  activeAccount: { name: string; address: string } | null;
  network: { id: string; name: string; chainId: string; remote: string; isTestnet: boolean };
  accounts: { name: string; address: string }[];
  ugnot: string;
  coins: { symbol: string; display: string; amount: string; kind: string }[];
};

export type PendingApproval =
  | {
      id: string;
      kind: 'establish';
      origin: string;
      siteName: string;
    }
  | {
      id: string;
      kind: 'contract';
      origin: string;
      summary: string;
      params: Record<string, unknown>;
    };

export type ExtResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };
