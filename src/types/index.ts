export type WalletAccount = {
  name: string;
  /** bech32 g1… */
  address: string;
  /** raw address bytes when available from gnonative */
  addressBytes?: Uint8Array;
};

export type LocalTxRecord = {
  id: string;
  hash?: string;
  type: 'send' | 'call' | 'other';
  status: 'pending' | 'success' | 'failed';
  from: string;
  to?: string;
  amount?: string;
  memo?: string;
  pkgPath?: string;
  func?: string;
  networkId: string;
  chainId: string;
  createdAt: number;
  error?: string;
};

export type CustomToken = {
  id: string;
  symbol: string;
  name: string;
  /** realm path e.g. gno.land/r/demo/grc20demo */
  pkgPath: string;
  decimals: number;
  networkId: string;
};

export type GnoConnectPayload = {
  rpc?: string;
  chainId?: string;
  pkgPath?: string;
  func?: string;
  args?: string[];
  send?: string;
  rawUrl?: string;
};
