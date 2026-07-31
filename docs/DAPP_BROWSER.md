# In-app dApp browser & GnoSwap

## Overview

The wallet ships an **in-app browser** with an **Adena-compatible** `window.adena` bridge so dApps such as [GnoSwap](https://beta.gnoswap.io/) can request connection and transaction approval without the Chrome extension.

## User flow

1. Open **Explore** (or Home → **Swap**).
2. Launch **GnoSwap** — the app may switch to **Topaz** (`topaz-1`).
3. In GnoSwap, choose **Connect → Adena**.
4. Approve the connection sheet in this wallet.
5. When GnoSwap builds a swap / LP tx, approve the **DoContract** sheet.

Requirements:

- A created/imported account
- Vault **unlocked** (Settings → Unlock) before signing

## Implementation

| Piece | Path |
|-------|------|
| dApp catalog | `src/config/dapps.ts` |
| Injected script | `src/services/adenaInjectScript.ts` |
| Approval host | `src/provider/AdenaHost.tsx` |
| Browser UI | `src/screens/DAppBrowserScreen.tsx` |

Supported Adena methods (subset):

- `AddEstablish`
- `GetAccount` / `GetNetwork` / `IsConnected`
- `DoContract` (`/bank.MsgSend`, `/vm.m_call`)
- `SwitchNetwork` (built-in chains only)

## Platform notes

| Platform | Behavior |
|----------|----------|
| iOS / Android (dev build) | `react-native-webview` injects `window.adena` before page scripts |
| Web / GitHub Pages | WebView falls back to iframe; bridge via `postMessage`. Some dApps may still expect a browser extension — use a native build for the best GnoSwap experience |

## Adding more dApps

Add an entry to `FEATURED_DAPPS` / `CATALOG_DAPPS` in `src/config/dapps.ts` with `injectAdena: true` when the site uses Adena APIs.
