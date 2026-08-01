/**
 * GnoSwap router helpers: quote (DrySwapRoute) + execute (Approve + ExactInSwapRoute).
 * Works without WebView — pure MsgCall via wallet client.
 */

import {
  GNOSWAP_ROUTER_ADDRESS,
  GNOSWAP_ROUTER_PATH,
  SWAP_FEE_TIERS,
  WUGNOT_PKG,
  type SwapToken,
} from '@/config/swapTokens';

export type DryQuote = {
  amountIn: string;
  amountOut: string;
  success: boolean;
  route: string;
  fee: number;
  raw: string;
};

function b64decode(b64: string): string {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return Buffer.from(b64, 'base64').toString('utf8');
}

function b64encode(s: string): string {
  if (typeof btoa === 'function') return btoa(s);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return Buffer.from(s).toString('base64');
}

/** Parse gno qeval multi-return text like: ("1000" string)\\n("2000" string)\\n(true bool) */
export function parseQevalTuple(raw: string): string[] {
  const out: string[] = [];
  const re = /\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const inner = m[1].trim();
    // "123" string  |  true bool  |  false bool
    const strM = inner.match(/^"((?:\\.|[^"\\])*)"/);
    if (strM) {
      out.push(strM[1]);
      continue;
    }
    const boolM = inner.match(/^(true|false)\s+bool$/i);
    if (boolM) {
      out.push(boolM[1].toLowerCase());
      continue;
    }
    const numM = inner.match(/^(-?\d+)/);
    if (numM) out.push(numM[1]);
    else out.push(inner);
  }
  return out;
}

export async function rpcQeval(rpcUrl: string, expr: string): Promise<string> {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'abci_query',
    params: {
      path: 'vm/qeval',
      data: b64encode(expr),
      height: '0',
      prove: false,
    },
  };
  const res = await fetch(rpcUrl.replace(/\/$/, ''), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const rb = json?.result?.response?.ResponseBase;
  if (rb?.Error) {
    const msg =
      typeof rb.Error === 'object' && rb.Error?.value
        ? String(rb.Error.value)
        : JSON.stringify(rb.Error);
    throw new Error(msg.split('\n')[0] || 'qeval failed');
  }
  if (!rb?.Data) throw new Error('Empty qeval response');
  return b64decode(rb.Data);
}

export function buildSingleHopRoute(
  inputTokenId: string,
  outputTokenId: string,
  fee: number,
): string {
  return `${inputTokenId}:${outputTokenId}:${fee}`;
}

/**
 * Find best single-hop fee tier by dry-running each tier (max amountOut).
 */
export async function quoteExactIn(params: {
  rpcUrl: string;
  inputToken: string;
  outputToken: string;
  amountIn: string;
  fees?: number[];
  amountOutMinProbe?: string;
}): Promise<DryQuote> {
  const {
    rpcUrl,
    inputToken,
    outputToken,
    amountIn,
    fees = SWAP_FEE_TIERS.map((f) => f.fee),
    amountOutMinProbe = '1',
  } = params;

  if (!/^\d+$/.test(amountIn) || amountIn === '0') {
    throw new Error('Amount must be a positive integer (base units)');
  }

  let best: DryQuote | null = null;
  const errors: string[] = [];

  for (const fee of fees) {
    const route = buildSingleHopRoute(inputToken, outputToken, fee);
    const expr = `${GNOSWAP_ROUTER_PATH}.DrySwapRoute("${inputToken}","${outputToken}","${amountIn}","EXACT_IN","${route}","100","${amountOutMinProbe}")`;
    try {
      const raw = await rpcQeval(rpcUrl, expr);
      const parts = parseQevalTuple(raw);
      // amountIn, amountOut, success
      const aIn = parts[0] ?? '0';
      const aOut = parts[1] ?? '0';
      const ok = (parts[2] ?? 'false') === 'true';
      if (!ok || aOut === '0') {
        errors.push(`fee ${fee}: no liquidity / failed`);
        continue;
      }
      const q: DryQuote = {
        amountIn: aIn,
        amountOut: aOut,
        success: true,
        route,
        fee,
        raw,
      };
      if (!best || BigInt(q.amountOut) > BigInt(best.amountOut)) best = q;
    } catch (e) {
      errors.push(`fee ${fee}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!best) {
    throw new Error(
      errors.slice(0, 3).join('; ') || 'No route found for this pair on GnoSwap',
    );
  }
  return best;
}

export function applySlippageMinOut(amountOut: string, slippageBps: number): string {
  const out = BigInt(amountOut);
  const bps = BigInt(Math.max(0, Math.min(5000, slippageBps)));
  const min = (out * (10000n - bps)) / 10000n;
  return min.toString();
}

export function toBaseUnits(display: string, decimals: number): string {
  const t = display.trim();
  if (!t || Number(t) < 0) throw new Error('Invalid amount');
  if (!t.includes('.')) {
    const whole = t.replace(/^0+/, '') || '0';
    return whole + '0'.repeat(decimals);
  }
  const [w, f = ''] = t.split('.');
  const frac = (f + '0'.repeat(decimals)).slice(0, decimals);
  const whole = (w || '0').replace(/^0+/, '') || '0';
  const raw = whole + frac;
  return raw.replace(/^0+/, '') || '0';
}

export function fromBaseUnits(amount: string, decimals: number): string {
  if (!/^\d+$/.test(amount)) return '0';
  if (decimals <= 0) return amount;
  const pad = amount.padStart(decimals + 1, '0');
  const i = pad.length - decimals;
  const whole = pad.slice(0, i).replace(/^0+(?=\d)/, '') || '0';
  const frac = pad.slice(i).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

export type SwapPlan = {
  /** Optional wrap GNOT → WUGNOT first */
  wrapUgnot?: string;
  /** Approve router to spend input GRC20 */
  approve: { pkgPath: string; spender: string; amount: string };
  /** Router ExactInSwapRoute args */
  swap: {
    pkgPath: string;
    func: string;
    args: string[];
  };
  quote: DryQuote;
  amountOutMin: string;
  deadline: number;
};

export function buildExactInPlan(opts: {
  input: SwapToken;
  output: SwapToken;
  /** base units */
  amountIn: string;
  quote: DryQuote;
  slippageBps: number;
  /** use native GNOT and wrap first */
  useNativeGnot?: boolean;
  referrer?: string;
}): SwapPlan {
  const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
  const amountOutMin = applySlippageMinOut(opts.quote.amountOut, opts.slippageBps);
  const referrer = opts.referrer || '';

  const plan: SwapPlan = {
    approve: {
      pkgPath: opts.input.pkgPath,
      spender: GNOSWAP_ROUTER_ADDRESS,
      amount: opts.amountIn,
    },
    swap: {
      pkgPath: GNOSWAP_ROUTER_PATH,
      func: 'ExactInSwapRoute',
      args: [
        opts.input.id,
        opts.output.id,
        opts.amountIn,
        opts.quote.route,
        '100',
        amountOutMin,
        String(deadline),
        referrer,
      ],
    },
    quote: opts.quote,
    amountOutMin,
    deadline,
  };

  if (opts.useNativeGnot && opts.input.wrapsNative) {
    plan.wrapUgnot = opts.amountIn;
  }

  return plan;
}

export { GNOSWAP_ROUTER_ADDRESS, GNOSWAP_ROUTER_PATH, WUGNOT_PKG };
