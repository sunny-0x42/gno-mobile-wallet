# Deployment

## Can GitHub “run the server” for everyone?

| Approach | Works? | Notes |
|----------|--------|--------|
| **GitHub Pages (static web export)** | ✅ Yes | Best public demo; no long-running Node process |
| **Vercel / Netlify / Cloudflare Pages** | ✅ Yes | Same static export |
| **Always-on Metro (`expo start`) on GitHub** | ❌ No | GitHub does not host free 24/7 app servers |
| **GitHub Actions** | ✅ Build only | Builds on push; can deploy artifacts to Pages |
| **Codespaces** | ⚠️ Temporary | Contributors run `npm run web` in a cloud IDE |

**Conclusion:** publish a **static web build** to GitHub Pages so anyone opens a URL. For local development, contributors still run `npm run web` / `web:lan` on their machines.

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
- Runs `npx expo export --platform web`  
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
