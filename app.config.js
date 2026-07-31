/**
 * Expo config. Set GITHUB_PAGES=1 (CI) to prefix assets for project Pages URLs:
 *   https://<user>.github.io/gno-mobile-wallet/
 * Override with BASE_URL=/your-repo-name if the repository name differs.
 */
const baseUrl =
  process.env.BASE_URL ||
  (process.env.GITHUB_PAGES === '1' ? '/gno-mobile-wallet' : '');

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Gno Wallet',
  slug: 'gno-mobile-wallet',
  version: '0.1.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  scheme: 'gnomobile',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'land.gno.mobilewallet',
    buildNumber: '1',
    requireFullScreen: false,
    infoPlist: {
      CFBundleDisplayName: 'Gno Wallet',
      UIRequiresFullScreen: false,
      UISupportedInterfaceOrientations: [
        'UIInterfaceOrientationPortrait',
        'UIInterfaceOrientationPortraitUpsideDown',
      ],
      'UISupportedInterfaceOrientations~ipad': [
        'UIInterfaceOrientationPortrait',
        'UIInterfaceOrientationPortraitUpsideDown',
        'UIInterfaceOrientationLandscapeLeft',
        'UIInterfaceOrientationLandscapeRight',
      ],
      NSFaceIDUsageDescription: 'Unlock your Gno wallet with Face ID.',
      NSCameraUsageDescription: 'Scan QR codes to receive or connect to dApps.',
      ITSAppUsesNonExemptEncryption: false,
      LSApplicationQueriesSchemes: ['https', 'http'],
    },
    config: {
      usesNonExemptEncryption: false,
    },
    associatedDomains: [],
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#000000',
    },
    package: 'land.gno.mobilewallet',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'gnomobile' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [],
  web: {
    bundler: 'metro',
    // SPA export (App.tsx entry). Do not set output:"static" — that requires expo-router.
    favicon: './assets/favicon.png',
    name: 'Gno Wallet',
    shortName: 'Gno',
    lang: 'en',
    themeColor: '#000000',
    backgroundColor: '#000000',
    display: 'standalone',
    orientation: 'portrait',
    description: 'Open-source non-custodial wallet for gno.land (web + mobile)',
  },
  extra: {
    useMock: false,
  },
  experiments: baseUrl
    ? {
        baseUrl,
      }
    : undefined,
};
