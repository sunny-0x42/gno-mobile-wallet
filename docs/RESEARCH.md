# Research: Adena → mobile Gno wallet

## Adena (reference product)

| Field | Value |
|-------|--------|
| Product | Non-custodial browser extension for gno.land |
| Author | Onbloc |
| Site | https://adena.app |
| Source | https://github.com/onbloc/adena-wallet |
| Mobile | Historically “coming soon” on marketing site |
| License (upstream LICENSE) | GPL-3.0 |

### Upstream monorepo sketch

```
packages/
  adena-extension   # React UI + Chrome shell
  adena-module      # Crypto / wallet core
  adena-torus-signin
```

Core stack includes `@gnolang/gno-js-client`, `@gnolang/tm2-js-client`, CosmJS, Ledger transports.

## Why not “fork the extension into an APK”

Chrome storage, content scripts, and popup UX do not map 1:1 to mobile. This project reuses **product scope and Gno key semantics**, not Adena branding or extension shell code.

## Mobile / web stack choices

| Option | Role in this repo |
|--------|-------------------|
| Expo + `gno-js-client` | **Web / PWA real wallets** |
| Expo + gnonative | Optional native keyring path |
| Static export | Public demo on GitHub Pages |

## Interoperability

Same bech32 HRP `g` and HD derivation via the official JS clients → mnemonics should match Adena / gnokey for the same BIP39 English phrase and account index `0`.

## License posture

- Original code here: **Apache-2.0**
- Copying Adena sources would inherit **GPL-3.0** obligations — avoid unless intentional
