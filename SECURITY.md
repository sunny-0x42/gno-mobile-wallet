# Security Policy

## Supported versions

The `main` branch is the only supported line until the first tagged release.

## Reporting a vulnerability

If you discover a security issue that could put user funds at risk:

1. **Do not** open a public GitHub issue with exploit details or seed phrases.
2. Prefer a private **GitHub Security Advisory** on the repository (once enabled by maintainers).
3. Include steps to reproduce, affected platforms (web / iOS / Android), and impact.

We will acknowledge reports as soon as maintainers are available and coordinate a fix and disclosure timeline.

## Safe testing

- Prefer **testnets** (Topaz, etc.).
- Never share recovery phrases in screenshots, CI logs, or issues.

## Wallet secrets & passkeys

| Layer | Role |
|-------|------|
| **BIP39 seed** | Root of fund control — never leaves the device unencrypted |
| **Password** | Derives AES key that encrypts the seed in browser storage |
| **Device passkey** (optional) | WebAuthn platform authenticator (Windows Hello / Face ID / Touch ID / etc.) used as a **second unlock factor** |

When passkey is enabled for an account:

1. Password is verified (can decrypt the vault).
2. Platform passkey assertion must succeed.
3. Only then is the signing session opened.

Passkeys do **not** replace the password and are bound to the site origin (e.g. `gno-mobile-wallet.netlify.app`). They require HTTPS (or localhost). Clearing site data removes local passkey registration metadata; the OS may still keep the credential, but the wallet will treat passkey as disabled until re-enabled.

## Reporting a vulnerability (reminder)

Never paste mnemonics or passwords into issues.
