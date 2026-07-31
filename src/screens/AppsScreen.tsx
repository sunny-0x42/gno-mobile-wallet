import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Muted } from '@/components/ui';
import { CATALOG_DAPPS, FEATURED_DAPPS } from '@/config/dapps';
import { useRootNavigation } from '@/hooks/useRootNavigation';
import { useWallet } from '@/provider/WalletProvider';
import { colors, spacing, typography } from '@/theme';

export default function AppsScreen() {
  const { navigateRoot } = useRootNavigation();
  const { network, activeAccount } = useWallet();

  const openDApp = (id: string) => {
    const dapp = CATALOG_DAPPS.find((d) => d.id === id);
    if (!dapp) return;
    navigateRoot('DAppBrowser', {
      url: dapp.url,
      title: dapp.name,
      injectAdena: !!dapp.injectAdena,
      preferredChainId: dapp.preferredChainId,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <Text style={typography.largeTitle}>Explore</Text>
        <Muted>
          Open gno.land dApps in the in-app browser. GnoSwap can connect via an Adena-compatible
          wallet API built into this app.
        </Muted>

        <View style={styles.networkHint}>
          <View
            style={[
              styles.dot,
              { backgroundColor: network.isTestnet ? colors.orange : colors.success },
            ]}
          />
          <Text style={styles.networkText}>
            {network.name}
            {activeAccount ? ` · ${activeAccount.address.slice(0, 8)}…` : ' · no account'}
          </Text>
        </View>

        <Text style={styles.section}>Featured</Text>
        {FEATURED_DAPPS.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => openDApp(d.id)}
            style={({ pressed }) => [styles.featured, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.featuredIcon, { backgroundColor: d.color + '33' }]}>
              <Ionicons name={d.icon} size={28} color={d.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featuredName}>{d.name}</Text>
              <Text style={styles.featuredDesc}>{d.description}</Text>
              <Text style={styles.featuredCta}>Open in wallet →</Text>
            </View>
          </Pressable>
        ))}

        <Button
          title="Launch GnoSwap"
          icon="swap-horizontal"
          size="lg"
          onPress={() => openDApp('gnoswap')}
        />

        <Text style={[styles.section, { marginTop: 20 }]}>More</Text>
        <View style={styles.grid}>
          {CATALOG_DAPPS.filter((d) => !d.featured).map((d) => (
            <Pressable
              key={d.id}
              onPress={() => openDApp(d.id)}
              style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.tileIcon, { backgroundColor: d.color + '33' }]}>
                <Ionicons name={d.icon} size={24} color={d.color} />
              </View>
              <Text style={styles.tileName}>{d.name}</Text>
              <Text style={styles.tileDesc}>{d.description}</Text>
            </Pressable>
          ))}
        </View>

        <Button
          title="Call a Realm"
          icon="code-slash"
          variant="secondary"
          onPress={() => navigateRoot('CallRealm')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  networkHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  networkText: { ...typography.subhead },
  section: {
    ...typography.footnote,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  featured: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.bgElevated,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  featuredIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredName: { ...typography.title3 },
  featuredDesc: { ...typography.footnote, marginTop: 4 },
  featuredCta: { ...typography.caption1, color: colors.primary, marginTop: 8, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  tile: {
    width: '47%',
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileName: { ...typography.headline, fontSize: 16 },
  tileDesc: { ...typography.caption1, marginTop: 4 },
});
