// Polyfills first — Buffer is required by @gnolang/* balance parsers on web
import { Buffer } from 'buffer';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = typeof globalThis !== 'undefined' ? globalThis : global;
if (!g.Buffer) g.Buffer = Buffer;

import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import React, { useEffect } from 'react';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WalletProvider, useWallet } from '@/provider/WalletProvider';
import RootNavigator from '@/router/RootNavigator';
import { BUILTIN_NETWORKS, DEFAULT_NETWORK_ID } from '@/config/networks';
import { colors } from '@/theme';

const defaultNet = BUILTIN_NETWORKS.find((n) => n.id === DEFAULT_NETWORK_ID)!;

function StatusBarConfig() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(colors.bg);
      RNStatusBar.setBarStyle('light-content');
    }
  }, []);
  return <StatusBar style="light" />;
}

function AppTree() {
  return (
    <SafeAreaProvider>
      <WalletProvider>
        <StatusBarConfig />
        <RootNavigator />
      </WalletProvider>
    </SafeAreaProvider>
  );
}

/**
 * iOS / iPadOS entry.
 * - Mock: EXPO_PUBLIC_USE_MOCK=1
 * - Device: expo prebuild && expo run:ios (requires macOS + Xcode)
 */
export default function App() {
  // Web / PWA / explicit mock → never load native gnonative
  if (
    process.env.EXPO_PUBLIC_USE_MOCK === '1' ||
    Platform.OS === 'web' ||
    typeof document !== 'undefined'
  ) {
    return <AppTree />;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GnoNativeProvider, useGnoNativeContext } = require('@gnolang/gnonative');

    function Bridge() {
      const { attachNativeGnonative } = useWallet();
      const { gnonative } = useGnoNativeContext();
      useEffect(() => {
        if (gnonative) attachNativeGnonative(gnonative);
      }, [gnonative, attachNativeGnonative]);
      return null;
    }

    return (
      <SafeAreaProvider>
        <GnoNativeProvider
          config={{ remote: defaultNet.remote, chain_id: defaultNet.chainId }}
        >
          <WalletProvider>
            <StatusBarConfig />
            <Bridge />
            <RootNavigator />
          </WalletProvider>
        </GnoNativeProvider>
      </SafeAreaProvider>
    );
  } catch {
    return <AppTree />;
  }
}
