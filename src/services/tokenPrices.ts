/**
 * Token USD prices on Topaz via GnoSwap DrySwapRoute → test USDC.
 * Not mainnet market prices — on-chain pool quotes for the active testnet.
 */

import { TOPAZ_SWAP_TOKENS, type SwapToken } from '@/config/swapTokens';
import { quoteExactIn, fromBaseUnits } from '@/services/gnoswapRouter';

export type TokenPrice = {
  symbol: string;
  /** USD per 1 whole token (USDC units) */
  priceUsd: number;
  /** quote source */
  source: 'gnoswap-usdc' | 'stable' | 'none';
  updatedAt: number;
};

const USDC_ID = 'gno.land/r/gnoswap/test_token/test_usdc.USDC';
const USDC_DECIMALS = 6;

/** Stablecoins treated as ~$1 when no pool (fallback). */
const STABLE_SYMBOLS = new Set(['USDC', 'USDT', 'DAI']);

const cache = new Map<string, { at: number; prices: Record<string, TokenPrice> }>();
const CACHE_MS = 45_000;

function oneUnitBase(decimals: number): string {
  if (decimals <= 0) return '1';
  return '1' + '0'.repeat(decimals);
}

/**
 * Map display symbols used in CoinBalance → GnoSwap registry ids.
 */
export function priceCatalogForChain(chainId: string): {
  symbol: string;
  tokenId: string;
  decimals: number;
  /** native GNOT priced via WUGNOT */
  via?: string;
}[] {
  if (chainId !== 'topaz-1') {
    // Still attempt Topaz-style ids if same realms exist
  }
  const list: {
    symbol: string;
    tokenId: string;
    decimals: number;
    via?: string;
  }[] = [
    {
      symbol: 'GNOT',
      tokenId: 'gno.land/r/gnoland/wugnot.wugnot',
      decimals: 6,
      via: 'WUGNOT',
    },
  ];
  for (const t of TOPAZ_SWAP_TOKENS) {
    list.push({ symbol: t.symbol, tokenId: t.id, decimals: t.decimals });
  }
  return list;
}

async function quoteUsdPrice(
  rpcUrl: string,
  tokenId: string,
  decimals: number,
  symbol: string,
): Promise<TokenPrice> {
  if (symbol === 'USDC' || tokenId === USDC_ID) {
    return {
      symbol,
      priceUsd: 1,
      source: 'stable',
      updatedAt: Date.now(),
    };
  }

  try {
    const amountIn = oneUnitBase(decimals);
    const q = await quoteExactIn({
      rpcUrl,
      inputToken: tokenId,
      outputToken: USDC_ID,
      amountIn,
    });
    const out = Number(fromBaseUnits(q.amountOut, USDC_DECIMALS));
    if (!Number.isFinite(out) || out <= 0) {
      throw new Error('bad quote');
    }
    return {
      symbol,
      priceUsd: out,
      source: 'gnoswap-usdc',
      updatedAt: Date.now(),
    };
  } catch {
    if (STABLE_SYMBOLS.has(symbol)) {
      return { symbol, priceUsd: 1, source: 'stable', updatedAt: Date.now() };
    }
    return { symbol, priceUsd: 0, source: 'none', updatedAt: Date.now() };
  }
}

/**
 * Fetch USD prices for known Topaz / GnoSwap tokens (parallel, cached).
 */
export async function fetchTokenPrices(
  rpcUrl: string,
  chainId: string,
): Promise<Record<string, TokenPrice>> {
  const key = `${chainId}|${rpcUrl}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.prices;

  const catalog = priceCatalogForChain(chainId);
  // Dedupe by symbol
  const bySym = new Map<string, (typeof catalog)[0]>();
  for (const c of catalog) {
    if (!bySym.has(c.symbol)) bySym.set(c.symbol, c);
  }

  const entries = await Promise.all(
    [...bySym.values()].map(async (c) => {
      const p = await quoteUsdPrice(rpcUrl, c.tokenId, c.decimals, c.symbol);
      return [c.symbol, p] as const;
    }),
  );

  const prices: Record<string, TokenPrice> = {};
  for (const [sym, p] of entries) prices[sym] = p;

  // GNOT uses WUGNOT price if WUGNOT succeeded
  if (prices.WUGNOT?.priceUsd && (!prices.GNOT?.priceUsd || prices.GNOT.source === 'none')) {
    prices.GNOT = {
      symbol: 'GNOT',
      priceUsd: prices.WUGNOT.priceUsd,
      source: prices.WUGNOT.source,
      updatedAt: Date.now(),
    };
  }

  cache.set(key, { at: Date.now(), prices });
  return prices;
}

export function formatUsd(n: number, opts?: { compact?: boolean }): string {
  if (!Number.isFinite(n) || n === 0) return '$0.00';
  const abs = Math.abs(n);
  if (opts?.compact && abs >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2)}M`;
  }
  if (opts?.compact && abs >= 10_000) {
    return `$${(n / 1_000).toFixed(2)}K`;
  }
  if (abs >= 1000) {
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  }
  if (abs >= 1) {
    return `$${n.toFixed(2)}`;
  }
  if (abs >= 0.01) {
    return `$${n.toFixed(4)}`;
  }
  return `$${n.toPrecision(3)}`;
}

export function valueUsd(amountDisplay: string, price: number | undefined): number {
  const a = Number(amountDisplay);
  if (!Number.isFinite(a) || !price || !Number.isFinite(price)) return 0;
  return a * price;
}

/** Watched GRC20 list for balances (from swap catalog + legacy). */
export function defaultWatchedGrc20(chainId: string): {
  pkgPath: string;
  symbol: string;
  decimals: number;
  name?: string;
}[] {
  if (chainId === 'topaz-1' || true) {
    // Prefer GnoSwap catalog tokens
    return TOPAZ_SWAP_TOKENS.map((t: SwapToken) => ({
      pkgPath: t.pkgPath,
      symbol: t.symbol,
      decimals: t.decimals,
      name: t.name,
    }));
  }
  return [];
}
