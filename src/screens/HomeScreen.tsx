import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ActionTile,
  Badge,
  EmptyState,
  Button,
  Row,
  Spacer,
} from '@/components/ui';
import SecureContextBanner from '@/components/SecureContextBanner';
import TokenIcon from '@/components/TokenIcon';
import { useRootNavigation } from '@/hooks/useRootNavigation';
import { useWallet } from '@/provider/WalletProvider';
import {
  fetchAllBalances,
  type CoinBalance,
} from '@/services/rpcBalance';
import { colors, layout, spacing, typography } from '@/theme';
import { shortAddress, ugnotToGnotDisplay } from '@/utils/format';

/** Balances only — no price/oracle RPC (faster load). */
const POLL_MS = 15_000;

export default function HomeScreen() {
  const { navigateRoot } = useRootNavigation();
  const { activeAccount, network, client, isMock, isUnlocked, accounts, tokens } =
    useWallet();
  const [ugnot, setUgnot] = useState('0');
  const [coins, setCoins] = useState<CoinBalance[]>([]);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { width } = useWindowDimensions();
  const isPad = width >= 768;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!activeAccount) return;
      if (!opts?.silent) setRefreshing(true);
      try {
        const extra = tokens
          .filter((t) => t.networkId === network.id)
          .map((t) => ({
            pkgPath: t.pkgPath,
            symbol: t.symbol,
            decimals: t.decimals,
          }));

        // Balances only (no GnoSwap price quotes in experimental build)
        const snap = await fetchAllBalances(
          network.remote,
          activeAccount.address,
          network.chainId,
          extra,
          { includeZeroGrc20: true },
        );

        if (snap.error) {
          const bal = await client.queryBalance(activeAccount.address);
          setUgnot(bal.ugnot);
          setCoins(
            bal.ugnot !== '0'
              ? [
                  {
                    denom: 'ugnot',
                    amount: bal.ugnot,
                    symbol: 'GNOT',
                    decimals: 6,
                    display: ugnotToGnotDisplay(bal.ugnot).replace(/,/g, ''),
                    kind: 'native',
                  },
                ]
              : [],
          );
          setLoadError(bal.unknownAddress ? undefined : snap.error);
        } else {
          setUgnot(snap.ugnot);
          setCoins(snap.coins);
          setLoadError(undefined);
        }
        setLastUpdated(Date.now());
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!opts?.silent) setRefreshing(false);
      }
    },
    [activeAccount, client, network, tokens],
  );

  useFocusEffect(
    useCallback(() => {
      load();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => load({ silent: true }), POLL_MS);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      };
    }, [load]),
  );

  // Reload when network switches
  useEffect(() => {
    load({ silent: true });
  }, [network.id, activeAccount?.address]);

  const copyAddress = async () => {
    if (!activeAccount) return;
    await Clipboard.setStringAsync(activeAccount.address);
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!activeAccount) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <EmptyState
          icon="wallet-outline"
          title="No wallet yet"
          message="Create or import a wallet to get started on gno.land."
          action={<Button title="Get Started" onPress={() => navigateRoot('Welcome')} />}
        />
      </SafeAreaView>
    );
  }

  const liveLabel = lastUpdated
    ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}`
    : 'Loading…';

  // Token rows: all coins (native + watched GRC20 catalog) — amounts only
  const tokenRows: CoinBalance[] =
    coins.length > 0
      ? coins
      : [
          {
            denom: 'ugnot',
            amount: ugnot,
            symbol: 'GNOT',
            decimals: 6,
            display: ugnotToGnotDisplay(ugnot).replace(/,/g, ''),
            kind: 'native',
          },
        ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.pad, isPad && styles.padWide]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <SecureContextBanner />
        <Row style={styles.topBar}>
          <Pressable
            onPress={() => navigateRoot('Networks')}
            style={({ pressed }) => [styles.networkPill, pressed && { opacity: 0.7 }]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: network.isTestnet ? colors.orange : colors.success },
              ]}
            />
            <Text style={styles.networkName}>{network.name}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </Pressable>
          <Row style={{ gap: 4 }}>
            {isMock ? (
              <Badge label="Fake mock" tone="warn" />
            ) : (
              <Badge label="Live" tone="ok" />
            )}
            {!isUnlocked && !isMock ? <Badge label="Locked" tone="warn" /> : null}
            <Pressable onPress={() => navigateRoot('Accounts')} hitSlop={layout.hitSlop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(activeAccount.name[0] || 'G').toUpperCase()}
                </Text>
              </View>
            </Pressable>
          </Row>
        </Row>

        <View style={styles.balanceCard}>
          <Text style={styles.accountName}>{activeAccount.name}</Text>
          <Text style={styles.balance} accessibilityLabel={`${ugnotToGnotDisplay(ugnot)} GNOT`}>
            {ugnotToGnotDisplay(ugnot)}
            <Text style={styles.balanceUnit}> GNOT</Text>
          </Text>
          <Text style={styles.liveMeta}>{liveLabel}</Text>
          {loadError ? <Text style={styles.unknown}>{loadError}</Text> : null}

          <Pressable onPress={copyAddress} style={styles.addrRow}>
            <Text style={styles.addr}>{shortAddress(activeAccount.address, 10, 8)}</Text>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color={copied ? colors.success : colors.textSecondary}
            />
          </Pressable>
        </View>

        <Row style={styles.actions}>
          <ActionTile
            icon="arrow-up"
            label="Send"
            color={colors.tint}
            onPress={() => navigateRoot('Send')}
          />
          <ActionTile
            icon="arrow-down"
            label="Receive"
            color={colors.primary}
            onPress={() => navigateRoot('Receive')}
          />
          <ActionTile
            icon="code-slash"
            label="Call"
            color={colors.purple}
            onPress={() => navigateRoot('CallRealm')}
          />
          <ActionTile
            icon="swap-horizontal"
            label="Swap"
            color={colors.orange}
            onPress={() => navigateRoot('Swap')}
          />
        </Row>

        <Spacer h={16} />
        <Text style={styles.section}>Assets</Text>
        <View style={styles.list}>
          {tokenRows.map((c, i) => (
            <View
              key={`${c.denom}-${c.pkgPath ?? ''}-${i}`}
              style={[styles.tokenRow, i < tokenRows.length - 1 && styles.tokenBorder]}
            >
              <TokenIcon symbol={c.symbol} size={36} />
              <Text style={[styles.tokenSym, { flex: 1 }]}>{c.symbol}</Text>
              <Text style={styles.tokenAmt}>{c.display}</Text>
            </View>
          ))}
        </View>

        <Spacer h={16} />
        <Text style={styles.section}>Shortcuts</Text>
        <View style={styles.list}>
          <Shortcut
            icon="people"
            color={colors.tint}
            title="Accounts"
            value={`${accounts.length}`}
            onPress={() => navigateRoot('Accounts')}
          />
          <Shortcut
            icon="pricetags"
            color={colors.purple}
            title="Custom Tokens"
            onPress={() => navigateRoot('Tokens')}
          />
          <Shortcut
            icon="time"
            color={colors.orange}
            title="Activity"
            onPress={() => navigateRoot('History')}
            last
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function Shortcut({
  icon,
  color,
  title,
  value,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcut,
        !last && styles.shortcutBorder,
        pressed && { opacity: 0.55 },
      ]}
    >
      <View style={[styles.shortcutIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={16} color={colors.white} />
      </View>
      <Text style={styles.shortcutTitle}>{title}</Text>
      {value ? <Text style={styles.shortcutValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  padWide: {
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: spacing.xxl,
  },
  topBar: {
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  networkName: { ...typography.subhead, color: colors.text, fontWeight: '600' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgElevated2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  avatarText: { ...typography.headline, fontSize: 15 },
  balanceCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  accountName: { ...typography.subhead, marginBottom: 8 },
  balance: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.4,
  },
  balanceUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  liveMeta: {
    ...typography.caption2,
    marginTop: 8,
    color: colors.textTertiary,
  },
  unknown: { ...typography.caption1, color: colors.orange, marginTop: 8, textAlign: 'center' },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: colors.fill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addr: { ...typography.mono, color: colors.textSecondary },
  actions: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: spacing.md,
  },
  section: {
    ...typography.footnote,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: 4,
    marginBottom: 8,
  },
  list: {
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  tokenBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  tokenSym: { ...typography.headline, fontSize: 16 },
  tokenAmt: { ...typography.headline, fontSize: 16 },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  shortcutBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  shortcutIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: { ...typography.body, flex: 1 },
  shortcutValue: { ...typography.body, color: colors.textSecondary },
});
