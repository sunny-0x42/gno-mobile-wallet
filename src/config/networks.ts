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

/**
 * Default gas for wallet txs.
 *
 * Topaz `auth/gasprice` ≈ `{ gas: 1000, price: "1ugnot" }` → **1 ugnot per 1000 gas**.
 * Min fee for a tx ≈ ceil(gas_wanted / 1000) ugnot. Paying a flat 1 GNOT per MsgCall
 * was ~5–50× overpay on wrap/approve/swap steps.
 *
 * "Out of gas" = gas_wanted too low (execution limit), not insufficient fee GNOT.
 * Simple realm calls: a few million. GnoSwap ExactInSwapRoute often needs 80M–150M+.
 */

/** Min ugnot fee for gas_wanted given Topaz-style price (1ugnot / 1000 gas) + buffer. */
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
/** CLMM swap — high limit to avoid OOG; fee scales with this (~0.19 GNOT min @ Topaz) */
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
