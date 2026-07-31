# Contributing to Gno Mobile Wallet

Thank you for helping improve an open wallet for the gno.land ecosystem.

## Code of collaboration

- Be respectful and constructive.
- Prefer English for issues, PRs, commit messages, UI strings, and docs.
- Do **not** paste real mnemonics, private keys, or mainnet secrets into issues or logs.

## Development setup

```bash
git clone https://github.com/<you>/gno-mobile-wallet.git
cd gno-mobile-wallet
npm install
npm run web:lan          # browser client against public RPC
npm run ts:check         # TypeScript
```

Optional Buf registry (only needed when installing/building `@gnolang/gnonative`):

```bash
npm config set @buf:registry https://buf.build/gen/npm/v1/
```

## Branch & PR workflow

1. Create a branch from `main`: `feature/…`, `fix/…`, or `docs/…`.
2. Make focused commits (complete sentences in commit messages).
3. Ensure `npm run ts:check` passes.
4. Open a pull request with:
   - **What** changed
   - **Why**
   - How you tested (browser / network / mock)

## Project conventions

| Topic | Convention |
|-------|------------|
| Language | TypeScript, English identifiers & comments |
| UI copy | English; keep strings short and clear |
| Paths | Use `@/` alias for `src/` |
| Networks | Add chains in `src/config/networks.ts` |
| Balances | Prefer `src/services/rpcBalance.ts` for browser-safe RPC |
| Secrets | Never commit `.env` with keys; never log seeds |

## What to work on

Good first areas:

- UI polish and accessibility
- Token registry / GRC20 discovery on Topaz
- Transaction history via indexer GraphQL
- Tests for `normalizeMnemonic`, balance parsing
- Native gnonative wiring + EAS builds
- i18n (keep English as default source language)

See [docs/ROADMAP.md](docs/ROADMAP.md).

## Security reports

If you find a vulnerability that could lose funds:

1. Do not open a public issue with exploit details.
2. Contact maintainers privately (GitHub Security Advisory on the repo, once enabled).
3. Allow time for a fix before disclosure.

## License

By contributing, you agree that your contributions are licensed under the Apache License 2.0 (see [LICENSE](LICENSE)).
