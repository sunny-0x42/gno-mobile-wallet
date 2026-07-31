import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Muted, Screen, Spacer } from '@/components/ui';
import type { RootStackParamList } from '@/router/types';
import { useWallet } from '@/provider/WalletProvider';
import { colors, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { isMock, accounts } = useWallet();

  React.useEffect(() => {
    if (accounts.length > 0) {
      navigation.replace('MainTabs');
    }
  }, [accounts, navigation]);

  return (
    <Screen scroll edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.hero}>
        <View style={styles.logoRing}>
          <View style={styles.logoInner}>
            <Ionicons name="planet" size={40} color={colors.primary} />
          </View>
        </View>
        <Spacer h={20} />
        {isMock ? <Badge label="Preview Mode" tone="warn" /> : <Badge label="Gno.land" tone="ok" />}
        <Spacer h={16} />
        <Text style={styles.heroTitle}>Gno Wallet</Text>
        <Text style={styles.heroSub}>
          Self-custody wallet for gno.land. On web, create/import a real BIP39 seed (g1 address,
          compatible with Adena & gnokey). Fund via faucet, then send on Topaz / testnets.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Create New Wallet"
          icon="add-circle-outline"
          size="lg"
          onPress={() => navigation.navigate('CreateWallet')}
        />
        <Button
          title="Import Seed Phrase"
          variant="secondary"
          icon="download-outline"
          size="lg"
          onPress={() => navigation.navigate('ImportWallet')}
        />
      </View>

      <View style={styles.features}>
        <Feature icon="shield-checkmark" text="Keys stay on your device" />
        <Feature icon="phone-portrait" text="Built for Apple platforms" />
        <Feature icon="git-network" text="Topaz · Test13 · Staging · Betanet" />
      </View>

      <Muted center>
        Never share your recovery phrase. This app is independent of Adena branding.
      </Muted>
    </Screen>
  );
}

function Feature({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 24 : 12,
    paddingBottom: 32,
  },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.separatorOpaque,
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    ...typography.largeTitle,
    textAlign: 'center',
  },
  heroSub: {
    ...typography.subhead,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    lineHeight: 22,
  },
  actions: {
    marginBottom: 28,
  },
  features: {
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    ...typography.callout,
    color: colors.textSecondary,
  },
});
