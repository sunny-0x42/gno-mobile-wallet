/** Adena-compatible response envelope used by GnoSwap and other dApps. */

export type AdenaResponse<T = unknown> = {
  code: number;
  status: 'success' | 'failure';
  type: string;
  message: string;
  data: T;
};

export type AdenaAccountData = {
  status: 'ACTIVE' | 'IN_ACTIVE';
  address: string;
  coins: string;
  public_key?: { '@type': string; value: string };
  account_number: string;
  sequence: string;
  chainId: string;
};

export type AdenaNetworkData = {
  chainId: string;
  networkName?: string;
  rpcUrl?: string;
  addressPrefix?: string;
};

export type AdenaContractMessage = {
  type: string;
  value: Record<string, unknown>;
};

export type AdenaDoContractParams = {
  messages: AdenaContractMessage[];
  memo?: string;
  gasFee?: number | string;
  gasWanted?: number | string;
  /** Some clients nest under tx */
  tx?: {
    messages: AdenaContractMessage[];
    memo?: string;
  };
};

export type AdenaPendingRequest =
  | {
      id: string;
      kind: 'establish';
      siteName: string;
      origin: string;
      resolve: (v: AdenaResponse) => void;
      reject: (e: Error) => void;
    }
  | {
      id: string;
      kind: 'contract';
      origin: string;
      params: AdenaDoContractParams;
      resolve: (v: AdenaResponse) => void;
      reject: (e: Error) => void;
    };
