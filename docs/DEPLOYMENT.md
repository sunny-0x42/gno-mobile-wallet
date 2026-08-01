# Deployment

## Can GitHub “run the server” for everyone?

| Approach | Works? | Notes |
|----------|--------|-------|
| **Netlify (static web export)** | ✅ Yes | Recommended for community demos (`*.netlify.app`) |
| **GitHub Pages (static web export)** | ✅ Yes | Project Pages URL needs `GITHUB_PAGES=1` base path |
| **Vercel / Cloudflare Pages** | ✅ Yes | Same static export |
| **Always-on Metro (`expo start`) on GitHub** | ❌ No | GitHub does not host free 24/7 app servers |
| **GitHub Actions** | ✅ Build only | Builds on push; can deploy artifacts to Pages |
| **Codespaces** | ⚠️ Temporary | Contributors run `npm run web` in a cloud IDE |

**Conclusion:** publish a **static web build** (Expo `export --platform web` → `dist/`) so anyone opens a URL. For local development, contributors still run `npm run web` / `web:lan` on their machines.

---

## Netlify (recommended for community trials)

Config lives in [`netlify.toml`](../netlify.toml):

| Setting | Value |
|---------|--------|
| Build command | install + `expo export --platform web` |
| Publish directory | `dist` |
| Base URL | **root** (`/`) — do not set `GITHUB_PAGES=1` |
| SPA | `/*` → `/index.html` (200) |

### Connect the GitHub repo (one-time)

1. Open [Netlify](https://app.netlify.com) (GitHub already linked).
2. **Add new site → Import an existing project → GitHub**.
3. Choose `sunny-0x42/gno-mobile-wallet` (or your fork).
4. Leave build settings as detected from `netlify.toml` (Publish directory = `dist`).
5. Deploy. Every push to `main` rebuilds automatically.

**Live site (this project):**

```text
https://gno-mobile-wallet.netlify.app
```

Admin: https://app.netlify.com/projects/gno-mobile-wallet  

Rename under **Site configuration → Domain management** if you want a different subdomain.

### Continuous deploy from GitHub

If deploys were done via CLI only, link the repo once so each push to `main` rebuilds:

1. Netlify → **gno-mobile-wallet** → **Project configuration → Build & deploy**
2. **Link repository** → GitHub → `sunny-0x42/gno-mobile-wallet`
3. Confirm branch `main` and that `netlify.toml` is used

### Manual CLI deploy

```bash
npm install --legacy-peer-deps
npx expo export --platform web
npx netlify-cli deploy --prod --dir=dist
```

Requires `netlify login` (or env `NETLIFY_AUTH_TOKEN`).

### Security note for public demos

- Use **Topaz / testnets** only for community trials.
- Encrypted vault is stored in the **browser** (localStorage); clearing site data wipes the vault.
- Never encourage large mainnet balances in a shared demo URL.

---

## GitHub Pages (this repo)

### 1. Push the repository

```bash
git init
git add .
git commit -m "Initial open-source release of Gno Mobile Wallet"
git branch -M main
git remote add origin https://github.com/<user>/gno-mobile-wallet.git
git push -u origin main
```

### 2. Enable Pages

**Repo → Settings → Pages → Source: GitHub Actions**

### 3. Workflow

`.github/workflows/deploy-pages.yml`:

- Installs dependencies
- Runs `npx expo export --platform web` with `GITHUB_PAGES=1`
- Uploads `dist/` to GitHub Pages

After the first successful run, the site is available at:

```text
https://<user>.github.io/gno-mobile-wallet/
```

If the repo is named differently, set `base` / homepage accordingly (see `package.json` `homepage` and Expo `experiments.baseUrl` if required).

### 4. Local static preview

```bash
npm run web:export
npx serve dist
```

---

## Important limitations of a public web wallet

- RPC calls go from **the user’s browser** to public gno.land RPCs (CORS must allow browsers — Topaz currently does).
- Encrypted vault lives in **browser storage** (lost if site data is cleared).
- Use **testnets** for demos; document risks clearly.

---

## Native app distribution (not “from GitHub alone”)

| Platform | Path |
|----------|------|
| iOS | EAS Build + Apple Developer ($99/yr) → TestFlight / Ad Hoc — see [IOS_DEVICE_INSTALL.md](./IOS_DEVICE_INSTALL.md) |
| Android | EAS Build → internal APK/AAB or Play Console |

GitHub Releases can host **APK** artifacts from Actions if you add an Android build job; iOS IPAs still need Apple signing.
