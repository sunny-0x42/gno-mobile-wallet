/**
 * GnoSwap token IDs on Topaz (from live pool paths).
 * Format: <pkg_path>.<SYMBOL> (registry key used by GnoSwap router/common).
 */

export type SwapToken = {
  /** GnoSwap registry token id */
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Realm package path for Approve / BalanceOf */
  pkgPath: string;
  /** Native GNOT can be wrapped to this token via Deposit */
  wrapsNative?: boolean;
};

/** Live pools on topaz-1 as of probe (gno.land/r/gnoswap/pool.GetPoolPaths). */
export const TOPAZ_SWAP_TOKENS: SwapToken[] = [
  {
    id: 'gno.land/r/gnoland/wugnot.wugnot',
    symbol: 'WUGNOT',
    name: 'Wrapped GNOT',
    decimals: 6,
    pkgPath: 'gno.land/r/gnoland/wugnot',
    wrapsNative: true,
  },
  {
    id: 'gno.land/r/gnoswap/gns.GNS',
    symbol: 'GNS',
    name: 'GnoSwap',
    decimals: 6,
    pkgPath: 'gno.land/r/gnoswap/gns',
  },
  {
    id: 'gno.land/r/gnoswap/test_token/test_usdc.USDC',
    symbol: 'USDC',
    name: 'Test USDC',
    decimals: 6,
    pkgPath: 'gno.land/r/gnoswap/test_token/test_usdc',
  },
  {
    id: 'gno.land/r/gnoswap/test_token/test_atom.ATOM',
    symbol: 'ATOM',
    name: 'Test ATOM',
    decimals: 6,
    pkgPath: 'gno.land/r/gnoswap/test_token/test_atom',
  },
  {
    id: 'gno.land/r/gnoswap/test_token/test_btc.BTC',
    symbol: 'BTC',
    name: 'Test BTC',
    decimals: 8,
    pkgPath: 'gno.land/r/gnoswap/test_token/test_btc',
  },
  {
    id: 'gno.land/r/gnoswap/test_token/test_dai.DAI',
    symbol: 'DAI',
    name: 'Test DAI',
    decimals: 6,
    pkgPath: 'gno.land/r/gnoswap/test_token/test_dai',
  },
  {
    id: 'gno.land/r/onbloc/ibc/union/apps/ucs03_zkgm.USDT',
    symbol: 'USDT',
    name: 'USDT (IBC)',
    decimals: 6,
    pkgPath: 'gno.land/r/onbloc/ibc/union/apps/ucs03_zkgm',
  },
];

export const GNOSWAP_ROUTER_PATH = 'gno.land/r/gnoswap/router';
/** Package address of the router realm on Topaz (from access.GetRoleAddresses). */
export const GNOSWAP_ROUTER_ADDRESS = 'g1vc883gshu5z7ytk5cdynhc8c2dh67pdp4cszkp';
export const WUGNOT_PKG = 'gno.land/r/gnoland/wugnot';

/** Fee tiers (bps-like tiers used by pools). */
export const SWAP_FEE_TIERS = [
  { fee: 100, label: '0.01%' },
  { fee: 500, label: '0.05%' },
  { fee: 3000, label: '0.3%' },
  { fee: 10000, label: '1%' },
] as const;

export function tokensForChain(chainId: string): SwapToken[] {
  if (chainId === 'topaz-1') return TOPAZ_SWAP_TOKENS;
  // Other nets: still expose catalog; dry-run will fail if pools missing
  return TOPAZ_SWAP_TOKENS;
}
