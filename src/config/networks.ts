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
 * Mainnet: gnoland-1 (live since 2026-09-12) — fresh chain, not a betanet hardfork.
 * rpc.gno.land now serves mainnet; retired betanet was chain-id `gnoland1`.
 * See https://docs.gno.land/resources/gnoland-networks/
 */
export const BUILTIN_NETWORKS: NetworkConfig[] = [
  {
    id: 'mainnet',
    name: 'Mainnet',
    chainId: 'gnoland-1',
    remote: 'https://rpc.gno.land:443',
    explorerUrl: 'https://gno.land',
    isTestnet: false,
    // No faucet on mainnet — real GNOT only
  },
  {
    id: 'pearl',
    name: 'Pearl',
    chainId: 'pearl-1',
    remote: 'https://rpc.pearl.testnets.gno.land:443',
    faucetUrl: 'https://faucet.gno.land',
    explorerUrl: 'https://pearl.testnets.gno.land',
    isTestnet: true,
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    chainId: 'sapphire-1',
    remote: 'https://rpc.sapphire.testnets.gno.land:443',
    faucetUrl: 'https://faucet.gno.land',
    explorerUrl: 'https://sapphire.testnets.gno.land',
    isTestnet: true,
  },
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
];

/** Default for new installs — production mainnet */
export const DEFAULT_NETWORK_ID = 'mainnet';

/**
 * Map legacy stored network ids (betanet used rpc.gno.land with old chain-id gnoland1).
 */
export function migrateNetworkId(id: string | null | undefined): string {
  if (!id) return DEFAULT_NETWORK_ID;
  if (id === 'betanet') return 'mainnet';
  return id;
}

export const UGNOT_PER_GNOT = 1_000_000;

/**
 * Default gas for wallet txs.
 *
 * Mainnet / recent testnets `auth/gasprice` ≈ `{ gas: 1000, price: "1ugnot" }`
 * → **1 ugnot per 1000 gas**. Fee ≈ ceil(gas_wanted / 1000) ugnot (+ buffer).
 *
 * "Out of gas" = gas_wanted too low (execution limit), not insufficient fee GNOT.
 * Simple realm calls: a few million. GnoSwap ExactInSwapRoute often needs 80M–150M+.
 */

/** Min ugnot fee for gas_wanted given 1ugnot/1000 gas + buffer. */
export function gasFeeForWanted(
  gasWanted: bigint,
  /** extra percent over min (default 25%) */
  bufferPercent = 25,
): string {
  if (gasWanted <= 0n) return '1000ugnot';
  // min = ceil(gasWanted / 1000)
  const minUgnot = (gasWanted + 999n) / 1000n;
  const buf = BigInt(Math.max(0, Math.min(200, bufferPercent)));
  const withBuf = (minUgnot * (100n + buf)) / 100n;
  // floor for tiny txs
  const fee = withBuf < 1000n ? 1000n : withBuf;
  return `${fee.toString()}ugnot`;
}

const SEND_WANTED = 2_000_000n;
const CALL_WANTED = 15_000_000n;
/** CLMM swap — high limit to avoid OOG; fee scales with this (~0.19 GNOT min) */
const SWAP_WANTED = 150_000_000n;
const APPROVE_WANTED = 12_000_000n;
const WRAP_WANTED = 8_000_000n;

export const DEFAULT_GAS = {
  sendGasWanted: SEND_WANTED,
  sendFee: gasFeeForWanted(SEND_WANTED),
  callGasWanted: CALL_WANTED,
  callFee: gasFeeForWanted(CALL_WANTED),
  swapGasWanted: SWAP_WANTED,
  swapFee: gasFeeForWanted(SWAP_WANTED),
  approveGasWanted: APPROVE_WANTED,
  approveFee: gasFeeForWanted(APPROVE_WANTED),
  wrapGasWanted: WRAP_WANTED,
  wrapFee: gasFeeForWanted(WRAP_WANTED),
};

export type CallGasOpts = {
  gasFee?: string;
  gasWanted?: bigint;
};

/** Human label e.g. "0.19 GNOT" from "187500ugnot" */
export function formatUgnotFee(fee: string): string {
  const m = fee.match(/^(\d+)ugnot$/i);
  if (!m) return fee;
  const ug = BigInt(m[1]);
  const whole = ug / 1_000_000n;
  const frac = ug % 1_000_000n;
  if (frac === 0n) return `${whole.toString()} GNOT`;
  const fracStr = frac.toString().padStart(6, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fracStr} GNOT`;
}
