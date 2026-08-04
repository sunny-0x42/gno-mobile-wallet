# Desktop extension (Chrome / Edge)

Manifest V3 extension for **Gno Wallet** — popup wallet + Adena-compatible `window.adena` for dApps.

## Install (developer / local)

1. Build:

```bash
npm run ext:build
```

2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. **Load unpacked** → select `extension/dist/`.

## Features (v0.1)

| Feature | Status |
|---------|--------|
| Create / import BIP39 wallet | ✅ |
| Password vault (`chrome.storage.local`) | ✅ |
| Unlock session (in-memory; cleared when SW restarts) | ✅ |
| Live GNOT + token balances (Topaz) | ✅ |
| Send GNOT | ✅ |
| Network switch | ✅ |
| Inject `window.adena` on https pages | ✅ |
| Connect + DoContract approval window | ✅ |
| Cross-device sync | ⏸️ Phase 2 |

## Usage with dApps

1. Unlock the extension popup.
2. Open a gno dApp (e.g. GnoSwap) that supports **Adena**.
3. Choose Connect → Adena (or Gno Wallet if listed via `isGnoMobileWallet`).
4. Approve connection / transactions in the popup window.

## Build scripts

| Command | Description |
|---------|-------------|
| `npm run ext:build` | Production build → `extension/dist` |
| `npm run ext:dev` | Vite watch (reload extension after rebuild) |

## Architecture

See product plan: content script injects `inpage.js` → messages background service worker → approval UI when needed.

## Security

- Seed encrypted at rest with password (same AES vault as web app).
- Never share seed phrases.
- Prefer **testnets** for demos.
- Host permissions limited to gno.land / gnoswap / localhost (expand if needed).

## Sync with mobile / web

v0.1 vaults are **independent**. Use the **same seed phrase** on web/mobile/extension to share addresses. Encrypted export/sync is planned later.
