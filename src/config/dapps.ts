/**
 * Curated dApps that can be opened inside the wallet browser.
 * GnoSwap is the flagship DEX on gno.land (Adena-compatible connect).
 */

export type DAppEntry = {
  id: string;
  name: string;
  description: string;
  /** Primary URL to open in the in-app browser */
  url: string;
  /** Optional chain preference when opening */
  preferredChainId?: string;
  icon: 'swap-horizontal' | 'planet' | 'water' | 'book' | 'desktop' | 'apps';
  color: string;
  featured?: boolean;
  /** Inject Adena-compatible provider when using WebView */
  injectAdena?: boolean;
};

export const FEATURED_DAPPS: DAppEntry[] = [
  {
    id: 'gnoswap',
    name: 'GnoSwap',
    description: 'Concentrated liquidity DEX — swap & provide liquidity on gno.land',
    url: 'https://beta.gnoswap.io/',
    preferredChainId: 'topaz-1',
    icon: 'swap-horizontal',
    color: '#3DDC97',
    featured: true,
    injectAdena: true,
  },
];

export const CATALOG_DAPPS: DAppEntry[] = [
  ...FEATURED_DAPPS,
  {
    id: 'gno-land',
    name: 'gno.land',
    description: 'Official portal and on-chain realms',
    url: 'https://gno.land',
    icon: 'planet',
    color: '#0A84FF',
  },
  {
    id: 'faucet',
    name: 'Faucet Hub',
    description: 'Request testnet GNOT',
    url: 'https://faucet.gno.land',
    icon: 'water',
    color: '#64D2FF',
  },
  {
    id: 'docs',
    name: 'Gno Docs',
    description: 'Builders & users documentation',
    url: 'https://docs.gno.land',
    icon: 'book',
    color: '#BF5AF2',
  },
  {
    id: 'gnoswap-docs',
    name: 'GnoSwap Docs',
    description: 'Trade and liquidity guides',
    url: 'https://docs.gnoswap.io/',
    icon: 'book',
    color: '#FF9F0A',
  },
];
