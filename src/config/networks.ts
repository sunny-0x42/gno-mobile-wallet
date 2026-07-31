export type NetworkConfig = {
  id: string;
  name: string;
  chainId: string;
  /** RPC remote string accepted by gnonative / gnokey style clients */
  remote: string;
  faucetUrl?: string;
  explorerUrl?: string;
  isTestnet: boolean;
};

/**
 * Built-in networks.
 * Topaz: experimental testnet (chain-id topaz-1)
 * Also see https://docs.gno.land/resources/gnoland-networks/
 */
export const BUILTIN_NETWORKS: NetworkConfig[] = [
  {
    id: 'topaz',
    name: 'Topaz',
    chainId: 'topaz-1',
    remote: 'https://rpc.topaz.testnets.gno.land:443',
    faucetUrl: 'https://faucet.gno.land',
    explorerUrl: 'https://topaz.testnets.gno.land',
    isTestnet: true,
  },
  {
    id: 'test13',
    name: 'Test13',
    chainId: 'test-13',
    remote: 'https://rpc.test13.testnets.gno.land:443',
    faucetUrl: 'https://faucet.gno.land',
    explorerUrl: 'https://test13.testnets.gno.land',
    isTestnet: true,
  },
  {
    id: 'staging',
    name: 'Staging',
    chainId: 'staging',
    remote: 'https://rpc.staging.gno.land:443',
    faucetUrl: 'https://faucet.gno.land',
    explorerUrl: 'https://staging.gno.land',
    isTestnet: true,
  },
  {
    id: 'betanet',
    name: 'Betanet',
    chainId: 'gnoland1',
    remote: 'https://rpc.gno.land:443',
    explorerUrl: 'https://gno.land',
    isTestnet: false,
  },
];

/** Default for new installs — latest experimental testnet */
export const DEFAULT_NETWORK_ID = 'topaz';

export const UGNOT_PER_GNOT = 1_000_000;

export const DEFAULT_GAS = {
  sendFee: '1000000ugnot',
  sendGasWanted: BigInt(2_000_000),
  callFee: '1000000ugnot',
  callGasWanted: BigInt(5_000_000),
};
