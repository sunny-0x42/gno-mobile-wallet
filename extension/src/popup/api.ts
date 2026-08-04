import type { ExtRequest, ExtResponse, ExtState } from '../shared/messages';

export async function ext<T = unknown>(msg: ExtRequest): Promise<T> {
  const res = (await chrome.runtime.sendMessage(msg)) as ExtResponse;
  if (!res?.ok) throw new Error(res?.error || 'Extension error');
  return res.data as T;
}

export function getState() {
  return ext<ExtState>({ type: 'EXT_GET_STATE' });
}

export function shortAddr(a: string, h = 8, t = 6) {
  if (!a || a.length < h + t + 2) return a || '';
  return `${a.slice(0, h)}…${a.slice(-t)}`;
}

export function ugnotToGnot(ugnot: string): string {
  if (!/^\d+$/.test(ugnot)) return '0';
  const pad = ugnot.padStart(7, '0');
  const i = pad.length - 6;
  const whole = pad.slice(0, i).replace(/^0+(?=\d)/, '') || '0';
  const frac = pad.slice(i).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}
