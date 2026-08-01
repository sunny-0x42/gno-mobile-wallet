# Gno Mobile Wallet

Open-source, non-custodial **wallet for [gno.land](https://gno.land)** — mobile-first (Expo / React Native) with a **web client** that works in the browser and as a PWA.

Inspired by [Adena](https://adena.app) (desktop extension). Independent project — not affiliated with Onbloc; do not reuse Adena trademarks or assets.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Expo](https://img.shields.io/badge/Expo-51-black.svg)](https://expo.dev)
[![gno.land](https://img.shields.io/badge/chain-gno.land-30D158.svg)](https://gno.land)

---

## Features

| Area | Status |
|------|--------|
| Create / import BIP39 seed (`g1…` addresses) | ✅ Web (JS client) · 🔲 Native via gnonative |
| Encrypted local vault (password) | ✅ |
| Multi-network (Topaz, Test13, Staging, Betanet, custom RPC) | ✅ |
| Live GNOT balance (RPC `bank/balances`) | ✅ |
| Multi-asset list (native + watched GRC20) | ✅ |
| Send / receive GNOT | ✅ Web |
| Realm `MsgCall` | ✅ Web |
| **Quick Swap** (GnoSwap router, no WebView) | ✅ Topaz |
| Multi-account | ✅ |
| iOS / Android native shell | 🚧 Scaffold + EAS configs |
| In-app dApp browser + Adena API | ✅ (GnoSwap site may not load in mobile WebView) |

Default testnet: **Topaz** (`topaz-1`, `https://rpc.topaz.testnets.gno.land`).

---

## Quick start (local)

### Requirements

- Node.js 18+ (LTS recommended)
- npm or yarn
- For native builds: Xcode (iOS) or Android Studio; optional [EAS](https://expo.dev/eas)

```bash
git clone https://github.com/<your-org>/gno-mobile-wallet.git
cd gno-mobile-wallet
npm install
```

> **gnonative (optional native):** if you install `@gnolang/gnonative`, configure the Buf npm registry once:
>
> ```bash
> npm config set @buf:registry https://buf.build/gen/npm/v1/
> ```
>
> A project `.npmrc` is included for this.

### Web (real chain client)

```bash
npm run web:lan
# open http://localhost:8081  (or http://<LAN-IP>:8081 on a phone)
```

Creates/imports **real** BIP39 wallets, queries Topaz (or the selected network) over RPC, and can broadcast sends when the vault is unlocked.

### Development flags

| Env var | Effect |
|---------|--------|
| `EXPO_PUBLIC_FORCE_FAKE=1` | Pure UI mock (`g1mock…` addresses, no chain) |
| (default) | Web uses `WebGnoClient` (real keys + RPC) |

### Typecheck

```bash
npm run ts:check
```

---

## Hosted web demo (GitHub Pages)

GitHub **cannot** run a long-lived Metro/dev server for free. What works well:

1. **Static export + GitHub Pages** (recommended for a public demo)  
2. **Vercel / Netlify / Cloudflare Pages** from the same export  
3. **GitHub Codespaces** — temporary full `npm run web` for contributors  

This repo ships a **GitHub Actions** workflow that builds the web app and deploys to **GitHub Pages** on every push to `main`.

### Enable Pages on your fork

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the workflow manually under **Actions**).
4. Open `https://<user>.github.io/gno-mobile-wallet/` (or your custom domain).

### Deploy locally / inspect the export

```bash
npm run web:export
# static files under dist/
npx serve dist
```

**Security note:** a public web wallet stores encrypted seeds in the browser. Prefer **testnets** for demos; never encourage large mainnet balances in a PWA.

---

## Project layout

```
gno-mobile-wallet/
├── App.tsx                 # Entry (polyfills, providers)
├── app.json                # Expo config (iOS / Android / web)
├── eas.json                # EAS Build profiles
├── docs/                   # Design notes & guides (English)
├── src/
│   ├── components/         # Shared UI
│   ├── config/             # Networks, dApps, GnoSwap token catalog
│   ├── provider/           # Wallet + Adena host
│   ├── screens/            # App screens (incl. native Swap)
│   ├── services/           # RPC, web client, GnoSwap router, storage
│   ├── theme/              # Design tokens
│   └── utils/              # Mnemonic, vault, formatters
├── .github/workflows/      # CI + Pages deploy
└── package.json
```

---

## Architecture (short)

```
UI (Expo / React Native / Web)
        │
WalletProvider
        │
   ┌────┴────┐
   │         │
WebGnoClient   Native (gnonative) / mock
   │
GnoWallet + GnoJSONRPCProvider  OR  direct abci_query (balances)
   │
gno.land RPC (Topaz / …)
```

- **Web:** `@gnolang/gno-js-client` + `@gnolang/tm2-js-client` for keys/tx; browser-safe balance fetch in `src/services/rpcBalance.ts`.
- **Native (optional):** `@gnolang/gnonative` via `expo prebuild` / EAS.
- **Vault:** password-encrypted mnemonic (AES-GCM when `crypto.subtle` exists; pure-JS fallback for HTTP LAN).

---

## Networks

| Name | Chain ID | RPC |
|------|----------|-----|
| Topaz | `topaz-1` | `https://rpc.topaz.testnets.gno.land` |
| Test13 | `test-13` | `https://rpc.test13.testnets.gno.land:443` |
| Staging | `staging` | `https://rpc.staging.gno.land:443` |
| Betanet | `gnoland1` | `https://rpc.gno.land:443` |

Faucet: [https://faucet.gno.land](https://faucet.gno.land)

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md).

1. Fork → feature branch → PR against `main`
2. Keep the UI and docs in **English**
3. Run `npm run ts:check` before opening a PR
4. Prefer small, reviewable PRs

Discuss larger changes in an issue first.

---

## Security

- Non-custodial: keys never leave the device/browser vault.
- Web PWA is **not** as safe as a audited native app or hardware wallet.
- Report vulnerabilities privately if possible (see CONTRIBUTING); do not open public issues with live seed phrases.

---

## License

[Apache License 2.0](LICENSE)

Third-party packages keep their own licenses (`@gnolang/*`, Expo, etc.).

---

## Related links

- [gno.land](https://gno.land) · [Docs](https://docs.gno.land)
- [Adena](https://adena.app) · [adena-wallet](https://github.com/onbloc/adena-wallet)
- [gno-js-client](https://github.com/gnolang/gno-js-client) · [gnonative](https://github.com/gnolang/gnonative)
- [GnoConnect](https://docs.gno.land/resources/gnoconnect/)

---

## Docs index

| Document | Description |
|----------|-------------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Adena research notes |
| [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | Product requirements |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Roadmap |
| [docs/WEB_PWA.md](docs/WEB_PWA.md) | Browser / PWA usage |
| [docs/IOS_DEVICE_INSTALL.md](docs/IOS_DEVICE_INSTALL.md) | iOS / EAS install |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | GitHub Pages & hosting |
| [docs/DAPP_BROWSER.md](docs/DAPP_BROWSER.md) | GnoSwap / Adena bridge |
