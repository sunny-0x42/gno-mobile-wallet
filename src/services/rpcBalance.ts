/**
 * Direct RPC balance helpers that work in the browser (no Node Buffer required).
 * Used as primary path on web; more reliable than gno-js-client's Buffer-based parser.
 */

import { defaultWatchedGrc20 } from '@/services/tokenPrices';

export type CoinBalance = {
  denom: string;
  amount: string; // integer string in base units
  symbol: string;
  decimals: number;
  /** display amount e.g. "12.5" */
  display: string;
  kind: 'native' | 'grc20';
  pkgPath?: string;
};

function b64ToUtf8(b64: string): string {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  // Node
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return Buffer.from(b64, 'base64').toString('utf8');
}

function formatUnits(amount: string, decimals: number): string {
  if (!/^\d+$/.test(amount)) return '0';
  if (decimals <= 0) return amount;
  const pad = amount.padStart(decimals + 1, '0');
  const i = pad.length - decimals;
  const whole = pad.slice(0, i).replace(/^0+(?=\d)/, '') || '0';
  const frac = pad.slice(i).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

const DENOM_META: Record<string, { symbol: string; decimals: number }> = {
  ugnot: { symbol: 'GNOT', decimals: 6 },
  gnot: { symbol: 'GNOT', decimals: 0 },
};

/** Parse bank balances payload: "123ugnot" or "\"123ugnot,456foo\"" */
export function parseBankBalancesData(raw: string): CoinBalance[] {
  const cleaned = raw.replace(/^"+|"+$/g, '').replace(/"/g, '').trim();
  if (!cleaned || cleaned === 'null') return [];
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  const out: CoinBalance[] = [];
  for (const part of parts) {
    const m = part.match(/^(\d+)([a-zA-Z][a-zA-Z0-9/_.-]*)$/);
    if (!m) continue;
    const [, amount, denom] = m;
    const meta = DENOM_META[denom] ?? {
      symbol: denom.length <= 8 ? denom.toUpperCase() : denom,
      decimals: denom.startsWith('u') ? 6 : 0,
    };
    out.push({
      denom,
      amount,
      symbol: meta.symbol,
      decimals: meta.decimals,
      display: formatUnits(amount, meta.decimals),
      kind: 'native',
    });
  }
  return out;
}

export async function fetchNativeBalances(
  rpcUrl: string,
  address: string,
): Promise<CoinBalance[]> {
  const path = `bank/balances/${address}`;
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'abci_query',
    params: { path, data: '', height: '0', prove: false },
  };
  const res = await fetch(rpcUrl.replace(/\/$/, ''), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = (await res.json()) as {
    error?: { message?: string };
    result?: {
      response?: {
        ResponseBase?: { Error?: unknown; Data?: string | null; Log?: string };
      };
    };
  };
  if (json.error) throw new Error(json.error.message || 'RPC error');
  const rb = json.result?.response?.ResponseBase;
  if (rb?.Error) {
    // account missing / invalid
    return [];
  }
  const data = rb?.Data;
  if (!data) return [];
  return parseBankBalancesData(b64ToUtf8(data));
}

/**
 * Query GRC20 BalanceOf via vm/qeval.
 * Expression form used by gno: `pkg.BalanceOf("g1...")` or realm path style.
 */
export async function fetchGrc20Balance(
  rpcUrl: string,
  pkgPath: string,
  address: string,
  meta: { symbol: string; decimals: number },
): Promise<CoinBalance | null> {
  // Common patterns: BalanceOf(addr string) uint64
  const data = `${pkgPath}.BalanceOf("${address}")`;
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'abci_query',
    params: {
      path: 'vm/qeval',
      data: typeof btoa === 'function' ? btoa(data) : Buffer.from(data).toString('base64'),
      height: '0',
      prove: false,
    },
  };
  try {
    const res = await fetch(rpcUrl.replace(/\/$/, ''), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    const raw = json?.result?.response?.ResponseBase?.Data as string | null | undefined;
    if (!raw) return null;
    const text = b64ToUtf8(raw).replace(/"/g, '').trim();
    // qeval often returns `(12345 uint64)` or just number
    const m = text.match(/(\d+)/);
    if (!m) return null;
    const amount = m[1];
    if (amount === '0') {
      return {
        denom: meta.symbol.toLowerCase(),
        amount,
        symbol: meta.symbol,
        decimals: meta.decimals,
        display: '0',
        kind: 'grc20',
        pkgPath,
      };
    }
    return {
      denom: meta.symbol.toLowerCase(),
      amount,
      symbol: meta.symbol,
      decimals: meta.decimals,
      display: formatUnits(amount, meta.decimals),
      kind: 'grc20',
      pkgPath,
    };
  } catch {
    return null;
  }
}

/** Default watched GRC20 tokens per chain (GnoSwap catalog on Topaz). */
export const DEFAULT_WATCHED_TOKENS: Record<
  string,
  { pkgPath: string; symbol: string; decimals: number }[]
> = {
  'topaz-1': defaultWatchedGrc20('topaz-1'),
  'test-13': [{ pkgPath: 'gno.land/r/gnoland/wugnot', symbol: 'WUGNOT', decimals: 6 }],
  staging: [{ pkgPath: 'gno.land/r/gnoland/wugnot', symbol: 'WUGNOT', decimals: 6 }],
  gnoland1: [{ pkgPath: 'gno.land/r/gnoland/wugnot', symbol: 'WUGNOT', decimals: 6 }],
};

export async function fetchAllBalances(
  rpcUrl: string,
  address: string,
  chainId: string,
  extraTokens: { pkgPath: string; symbol: string; decimals: number }[] = [],
  opts?: { includeZeroGrc20?: boolean },
): Promise<{ coins: CoinBalance[]; ugnot: string; error?: string }> {
  const includeZero = opts?.includeZeroGrc20 !== false;
  try {
    const natives = await fetchNativeBalances(rpcUrl, address);
    const ugnot = natives.find((c) => c.denom === 'ugnot')?.amount ?? '0';

    // Ensure GNOT native row always present
    let nativeList = [...natives];
    if (!nativeList.some((c) => c.denom === 'ugnot')) {
      nativeList.unshift({
        denom: 'ugnot',
        amount: '0',
        symbol: 'GNOT',
        decimals: 6,
        display: '0',
        kind: 'native',
      });
    }

    const watchedRaw = [
      ...(DEFAULT_WATCHED_TOKENS[chainId] ?? defaultWatchedGrc20(chainId)),
      ...extraTokens,
    ];
    // Dedupe by pkgPath
    const seen = new Set<string>();
    const watched = watchedRaw.filter((t) => {
      if (seen.has(t.pkgPath)) return false;
      seen.add(t.pkgPath);
      return true;
    });

    const grc20: CoinBalance[] = [];
    await Promise.all(
      watched.map(async (t) => {
        const bal = await fetchGrc20Balance(rpcUrl, t.pkgPath, address, t);
        if (!bal) {
          // Still show catalog stub at zero so user sees supported tokens
          if (includeZero) {
            grc20.push({
              denom: t.symbol.toLowerCase(),
              amount: '0',
              symbol: t.symbol,
              decimals: t.decimals,
              display: '0',
              kind: 'grc20',
              pkgPath: t.pkgPath,
            });
          }
          return;
        }
        if (includeZero || bal.amount !== '0') grc20.push(bal);
      }),
    );

    // Non-zero first, then zeros; natives (GNOT) always first
    grc20.sort((a, b) => {
      const az = a.amount === '0' ? 1 : 0;
      const bz = b.amount === '0' ? 1 : 0;
      if (az !== bz) return az - bz;
      return a.symbol.localeCompare(b.symbol);
    });

    const coins = [
      ...nativeList.sort((a, b) => (a.denom === 'ugnot' ? -1 : b.denom === 'ugnot' ? 1 : 0)),
      ...grc20,
    ];
    return { coins, ugnot };
  } catch (e) {
    return {
      coins: [],
      ugnot: '0',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
