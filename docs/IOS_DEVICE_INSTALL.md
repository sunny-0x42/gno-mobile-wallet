# iOS device install

Building a signed iOS app requires **macOS** or **EAS cloud builds**. Windows cannot produce an IPA locally.

## Requirements

| Item | Required? | Notes |
|------|-----------|--------|
| [Expo](https://expo.dev/signup) account | Yes | Free |
| Apple Developer Program (~$99/year) | Yes* | For Ad Hoc / TestFlight / App Store |
| Physical iPhone / iPad | Yes | Same Apple ID for device registration |
| Mac + Xcode | Optional | Local `expo run:ios --device` |

\* Without Apple Developer, long-lived installs of third-party IPAs are not supported by Apple.

## EAS Build (from any OS)

```bash
cd gno-mobile-wallet
npm install
npx eas-cli login
npx eas-cli init
npx eas-cli device:create    # register device UDID for internal installs
npx eas-cli build --platform ios --profile preview
```

Profiles are defined in `eas.json`:

| Profile | Purpose |
|---------|---------|
| `preview` | Internal install, real client flags |
| `preview-mock` | Internal install, UI mock |
| `production` | Store / TestFlight oriented |

Install the finished build from the Expo dashboard link (Safari on device), then trust the developer certificate under **Settings → General → VPN & Device Management**.

### TestFlight

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

## Local Mac + cable

```bash
npx expo prebuild --platform ios --clean
npx expo run:ios --device
```

Select a signing Team in Xcode. Free Apple IDs are limited (~7-day certs).

## Web alternative

For UI and testnet experimentation without Apple Developer, use the [web / PWA](./WEB_PWA.md) or [GitHub Pages deploy](./DEPLOYMENT.md).
