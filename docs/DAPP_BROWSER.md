# Quick Swap (GnoSwap router) & in-app dApp browser

## Why native Quick Swap?

GnoSwap’s web UI (`https://beta.gnoswap.io/`) often **cannot load or connect** inside the mobile wallet browser (WebView / iframe limits). The wallet therefore exposes a **native Quick Swap** that talks to the GnoSwap **router realm** with pure `MsgCall` — no WebView required.

## Quick Swap (recommended)

### User flow

1. Home → **Swap**, or Explore → **Quick Swap**.
2. Wallet switches to **Topaz** (`topaz-1`) if needed.
3. Pick pair (e.g. GNOT/WUGNOT → GNS), amount, slippage.
4. Quote via `DrySwapRoute` (best fee tier among 100 / 500 / 3000 / 10000).
5. Confirm → optional **Deposit** (wrap GNOT), **Approve** router, **ExactInSwapRoute**.

### Implementation

| Piece | Path |
|-------|------|
| Token catalog (Topaz pools) | `src/config/swapTokens.ts` |
| Quote + plan builder | `src/services/gnoswapRouter.ts` |
| UI | `src/screens/SwapScreen.tsx` |
| Router realm | `gno.land/r/gnoswap/router` |
| Router address (spender) | `g1vc883gshu5z7ytk5cdynhc8c2dh67pdp4cszkp` |

Token IDs use GnoSwap registry form: `<pkg_path>.<SYMBOL>` (e.g. `gno.land/r/gnoland/wugnot.wugnot`).

Swap steps when selling native GNOT:

1. `gno.land/r/gnoland/wugnot.Deposit` with `send = N ugnot`
2. `input.Approve(routerAddress, amount)`
3. `router.ExactInSwapRoute(tokenIn, tokenOut, amountIn, route, 100, amountOutMin, deadline, referrer)`

## In-app dApp browser (optional)

The wallet still ships an **Adena-compatible** `window.adena` bridge for other dApps, and a best-effort open of the GnoSwap website.

### Browser user flow

1. Explore → **GnoSwap** (featured dApp).
2. If the site loads: Connect → Adena → approve connection / DoContract sheets.

Requirements:

- A created/imported account
- Vault **unlocked** (Settings → Unlock) before signing

### Browser implementation

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

### Platform notes

| Platform | Behavior |
|----------|----------|
| iOS / Android (dev build) | `react-native-webview` injects `window.adena` before page scripts |
| Web / GitHub Pages | WebView falls back to iframe; many SPA dApps (including GnoSwap) fail — **use Quick Swap** |

## Adding more dApps

Add an entry to `FEATURED_DAPPS` / `CATALOG_DAPPS` in `src/config/dapps.ts` with `injectAdena: true` when the site uses Adena APIs.
