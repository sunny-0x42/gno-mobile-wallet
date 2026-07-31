import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useAdenaHost } from '@/provider/AdenaHost';
import { useWallet } from '@/provider/WalletProvider';
import type { RootStackParamList } from '@/router/types';
import { buildAdenaInjectScript } from '@/services/adenaInjectScript';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DAppBrowser'>;

export default function DAppBrowserScreen({ navigation, route }: Props) {
  const { url: initialUrl, title, injectAdena = true } = route.params;
  const webRef = useRef<WebView>(null);
  const { handleMethod } = useAdenaHost();
  const { activeAccount, network, switchNetwork, networks } = useWallet();
  const [url, setUrl] = useState(initialUrl);
  const [addressBar, setAddressBar] = useState(initialUrl);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  const inject = useMemo(() => buildAdenaInjectScript(), []);

  // Prefer Topaz (or preferred chain) when opening GnoSwap-like dApps
  React.useEffect(() => {
    const preferred = route.params.preferredChainId;
    if (!preferred) return;
    const match = networks.find((n) => n.chainId === preferred || n.id === preferred);
    if (match && match.id !== network.id) {
      switchNetwork(match.id).catch(() => undefined);
    }
  }, [route.params.preferredChainId, networks, network.id, switchNetwork]);

  const reply = useCallback(
    (id: string, result?: unknown, error?: string) => {
      const payload = JSON.stringify({
        type: 'adena-response',
        id,
        result,
        error,
      });
      // RN WebView
      webRef.current?.injectJavaScript(`
        (function(){
          try {
            window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(payload)} }));
            window.postMessage(${JSON.stringify(payload)}, '*');
          } catch(e) {}
          true;
        })();
      `);
    },
    [],
  );

  const onMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      let data: {
        type?: string;
        id?: string;
        method?: string;
        params?: Record<string, unknown>;
      };
      try {
        data = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (data.type !== 'adena-request' || !data.id || !data.method) return;
      const origin = (() => {
        try {
          return new URL(url).origin;
        } catch {
          return url;
        }
      })();
      try {
        const result = await handleMethod(data.method, data.params || {}, origin);
        reply(data.id, result);
      } catch (e) {
        reply(data.id, undefined, e instanceof Error ? e.message : String(e));
      }
    },
    [handleMethod, reply, url],
  );

  // Web parent postMessage bridge (iframe path)
  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onWinMessage = async (ev: MessageEvent) => {
      let data = ev.data;
      try {
        if (typeof data === 'string') data = JSON.parse(data);
      } catch {
        return;
      }
      if (!data || data.source !== 'gno-wallet-adena' || data.type !== 'adena-request') return;
      const origin = (() => {
        try {
          return new URL(url).origin;
        } catch {
          return url;
        }
      })();
      try {
        const result = await handleMethod(data.method, data.params || {}, origin);
        // post back to iframe
        const frames = window.frames;
        for (let i = 0; i < frames.length; i++) {
          try {
            frames[i].postMessage(
              { type: 'adena-response', id: data.id, result },
              '*',
            );
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        for (let i = 0; i < window.frames.length; i++) {
          try {
            window.frames[i].postMessage(
              {
                type: 'adena-response',
                id: data.id,
                error: e instanceof Error ? e.message : String(e),
              },
              '*',
            );
          } catch {
            /* ignore */
          }
        }
      }
    };
    window.addEventListener('message', onWinMessage);
    return () => window.removeEventListener('message', onWinMessage);
  }, [handleMethod, url]);

  const go = () => {
    let next = addressBar.trim();
    if (!/^https?:\/\//i.test(next)) next = `https://${next}`;
    setUrl(next);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.toolbar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => webRef.current?.goBack()}
          style={styles.iconBtn}
          disabled={!canGoBack}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={canGoBack ? colors.text : colors.textTertiary}
          />
        </Pressable>
        <TextInput
          style={styles.address}
          value={addressBar}
          onChangeText={setAddressBar}
          onSubmitEditing={go}
          autoCapitalize="none"
          autoCorrect={false}
          selectTextOnFocus
        />
        <Pressable onPress={go} style={styles.iconBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.tint} />
        </Pressable>
        <Pressable onPress={() => Linking.openURL(url)} style={styles.iconBtn}>
          <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.walletBar}>
        <Text style={styles.walletBarText} numberOfLines={1}>
          {title || 'dApp'} · {network.name} ·{' '}
          {activeAccount ? activeAccount.address.slice(0, 10) + '…' : 'No account'}
        </Text>
        {injectAdena ? (
          <Text style={styles.badge}>Adena API</Text>
        ) : null}
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.webHint}>
          <Text style={styles.webHintText}>
            In-app browser: GnoSwap loads below. Tap Connect → Adena in the dApp; this wallet
            exposes an Adena-compatible API via the bridge. If the page blocks embedding, use the
            open-external button.
          </Text>
        </View>
      ) : null}

      <View style={styles.webWrap}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
        <WebView
          ref={webRef}
          source={{ uri: url }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(nav) => {
            setAddressBar(nav.url);
            setUrl(nav.url);
            setCanGoBack(nav.canGoBack);
          }}
          onMessage={onMessage}
          injectedJavaScriptBeforeContentLoaded={injectAdena ? inject : undefined}
          injectedJavaScript={injectAdena ? inject : undefined}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          setSupportMultipleWindows={false}
          // Web: still attempt; RNW may use iframe
          originWhitelist={['*']}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  iconBtn: { padding: 6 },
  address: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    color: colors.text,
    fontSize: 13,
  },
  walletBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.bgElevated,
  },
  walletBarText: { ...typography.caption1, color: colors.textSecondary, flex: 1 },
  badge: {
    ...typography.caption2,
    color: colors.black,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '700',
    overflow: 'hidden',
  },
  webHint: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(10,132,255,0.12)',
  },
  webHintText: { ...typography.caption2, color: colors.tint },
  webWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: colors.bg },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
