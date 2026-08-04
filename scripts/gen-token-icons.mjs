import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'tokens');

const map = {
  GNOT: 'gnot.svg',
  GNS: 'gns.svg',
  USDC: 'usdc.svg',
  ATOM: 'atom.svg',
  BTC: 'btc.svg',
  DAI: 'dai.svg',
  USDT: 'usdt.svg',
};

let out = `/** Token SVG icons from onbloc/gno-token-resource (used by GnoSwap). */
/* eslint-disable max-len */

export const TOKEN_ICON_SVGS: Record<string, string> = {
`;

for (const [sym, file] of Object.entries(map)) {
  let xml = fs.readFileSync(path.join(dir, file), 'utf8').trim();
  xml = xml.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  out += `  ${sym}: \`${xml}\`,\n`;
}

out += `};

/** WUGNOT uses GNOT mark (registry file is a plain circle). */
TOKEN_ICON_SVGS.WUGNOT = TOKEN_ICON_SVGS.GNOT;

export const TOKEN_FALLBACK_COLORS: Record<string, string> = {
  GNOT: '#00B1FF',
  WUGNOT: '#6EC8FF',
  GNS: '#3DDC97',
  USDC: '#2775CA',
  USDT: '#26A17B',
  DAI: '#F5AC37',
  ATOM: '#2E3148',
  BTC: '#F7931A',
};

export function getTokenIconSvg(symbol: string): string | undefined {
  return TOKEN_ICON_SVGS[symbol.toUpperCase()];
}

export function getTokenFallbackColor(symbol: string, fallback = '#8B8B9E'): string {
  return TOKEN_FALLBACK_COLORS[symbol.toUpperCase()] ?? fallback;
}
`;

const dest = path.join(root, 'src', 'config', 'tokenIcons.ts');
fs.writeFileSync(dest, out);
console.log('Wrote', dest, '(' + out.length + ' bytes)');
