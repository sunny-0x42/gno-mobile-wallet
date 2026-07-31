import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Muted } from '@/components/ui';
import { useWallet } from '@/provider/WalletProvider';
import type { RootStackParamList } from '@/router/types';
import { colors, spacing, typography } from '@/theme';

const DAPP_LINKS = [
  {
    name: 'gno.land',
    desc: 'Official portal & realms',
    url: 'https://gno.land',
    icon: 'planet' as const,
    color: colors.primary,
  },
  {
    name: 'Faucet Hub',
    desc: 'Get testnet GNOT',
    url: 'https://faucet.gno.land',
    icon: 'water' as const,
    color: colors.teal,
  },
  {
    name: 'Documentation',
    desc: 'Builders & users guides',
    url: 'https://docs.gno.land',
    icon: 'book' as const,
    color: colors.tint,
  },
  {
    name: 'Adena',
    desc: 'Desktop extension wallet',
    url: 'https://adena.app',
    icon: 'desktop' as const,
    color: colors.purple,
  },
];

export default function AppsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { network } = useWallet();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <Text style={typography.largeTitle}>Explore</Text>
        <Muted>
          Discover gno.land. In-app browser & connect protocol planned. Sign via Call Realm or deep
          links today.
        </Muted>

        <View style={styles.networkHint}>
          <View style={[styles.dot, { backgroundColor: network.isTestnet ? colors.orange : colors.success }]} />
          <Text style={styles.networkText}>Connected to {network.name}</Text>
        </View>

        <View style={styles.grid}>
          {DAPP_LINKS.map((d) => (
            <Pressable
              key={d.url}
              onPress={() => Linking.openURL(d.url)}
              style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.tileIcon, { backgroundColor: d.color + '33' }]}>
                <Ionicons name={d.icon} size={24} color={d.color} />
              </View>
              <Text style={styles.tileName}>{d.name}</Text>
              <Text style={styles.tileDesc}>{d.desc}</Text>
            </Pressable>
          ))}
        </View>

        <Button
          title="Call a Realm"
          icon="code-slash"
          size="lg"
          onPress={() => nav.navigate('CallRealm')}
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
