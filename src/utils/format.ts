import { UGNOT_PER_GNOT } from '@/config/networks';

export function shortAddress(addr: string, head = 8, tail = 6): string {
  if (!addr || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/** Parse user GNOT input to ugnot integer string (no denom). */
export function gnotToUgnot(amountGnot: string): string {
  const n = Number(amountGnot);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return String(Math.round(n * UGNOT_PER_GNOT));
}

export function ugnotToGnotDisplay(ugnot: string | number | bigint): string {
  const n = typeof ugnot === 'bigint' ? Number(ugnot) : Number(ugnot);
  if (!Number.isFinite(n)) return '0';
  return (n / UGNOT_PER_GNOT).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

export function formatCoinAmount(amountWithDenom: string): string {
  // e.g. "1234567ugnot"
  const m = amountWithDenom.match(/^(\d+)([a-zA-Z]+)$/);
  if (!m) return amountWithDenom;
  const [, amt, denom] = m;
  if (denom === 'ugnot') return `${ugnotToGnotDisplay(amt)} GNOT`;
  return `${amt} ${denom}`;
}

export function isLikelyG1Address(value: string): boolean {
  return /^g1[0-9a-z]{38,}$/i.test(value.trim());
}
