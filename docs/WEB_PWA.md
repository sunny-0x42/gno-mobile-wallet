# Web & PWA usage

## Local

```bash
npm install
npm run web:lan
```

- Desktop: `http://localhost:8081`
- Phone on the same Wi‑Fi: `http://<your-lan-ip>:8081`
- Safari → Share → **Add to Home Screen** for a PWA-like icon

Keep the terminal process running while you use the LAN URL.

## Real wallets on web

| Action | Behavior |
|--------|----------|
| Create / import | BIP39 English seed → real `g1…` address (Adena / gnokey compatible path) |
| Storage | Password-encrypted mnemonic in browser storage |
| Balances | Live RPC `bank/balances` + optional GRC20 watches |
| After reload | **Settings → Unlock** with password before Send |

## Environment flags

| Variable | Meaning |
|----------|---------|
| `EXPO_PUBLIC_FORCE_FAKE=1` | Fake UI-only mock (`g1mock…`) |
| (unset) | Real web client |

## Security

Treat the browser wallet as **testnet-friendly**. Do not store large mainnet balances in a PWA.
