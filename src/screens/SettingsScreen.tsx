import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Badge,
  Button,
  GroupedList,
  Input,
  ListRow,
  Muted,
} from '@/components/ui';
import { useRootNavigation } from '@/hooks/useRootNavigation';
import { useWallet } from '@/provider/WalletProvider';
import { colors, spacing, typography } from '@/theme';
import { alertAsync } from '@/utils/dialog';

export default function SettingsScreen() {
  const { navigateRoot } = useRootNavigation();
  const { network, isMock, isUnlocked, activeAccount, unlockAccount } = useWallet();
  const [pwd, setPwd] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockErr, setUnlockErr] = useState<string | undefined>();

  const onUnlock = async () => {
    if (!activeAccount) return;
    setUnlocking(true);
    setUnlockErr(undefined);
    try {
      await unlockAccount(activeAccount.name, pwd);
      setPwd('');
      await alertAsync('Unlocked', 'You can send and call realms until you close the tab.');
    } catch (e) {
      setUnlockErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <Text style={typography.largeTitle}>Settings</Text>
        <Muted>Wallet, network, and about.</Muted>

        <View style={styles.status}>
          <Text style={styles.statusLine}>
            {network.name} · {network.chainId}
          </Text>
          <Badge
            label={isMock ? 'Fake mock' : isUnlocked ? 'Unlocked' : 'Locked'}
            tone={isMock ? 'warn' : isUnlocked ? 'ok' : 'warn'}
          />
        </View>

        {!isMock && activeAccount && !isUnlocked ? (
          <View style={styles.unlockBox}>
            <Text style={styles.unlockTitle}>Unlock wallet to send</Text>
            <Muted>
              After reload, enter the password you set when creating/importing this account.
            </Muted>
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={pwd}
              onChangeText={setPwd}
              error={unlockErr}
            />
            <Button title="Unlock" icon="lock-open" onPress={onUnlock} loading={unlocking} />
          </View>
        ) : null}

        <Text style={styles.section}>Wallet</Text>
        <GroupedList>
          <ListRow
            icon="people"
            iconColor={colors.tint}
            title="Accounts"
            onPress={() => navigateRoot('Accounts')}
          />
          <ListRow
            icon="globe"
            iconColor={colors.primary}
            title="Networks"
            value={network.name}
            onPress={() => navigateRoot('Networks')}
          />
          <ListRow
            icon="pricetags"
            iconColor={colors.purple}
            title="Custom Tokens"
            onPress={() => navigateRoot('Tokens')}
          />
          <ListRow
            icon="code-slash"
            iconColor={colors.orange}
            title="Call Realm"
            onPress={() => navigateRoot('CallRealm')}
            last
          />
        </GroupedList>

        <Text style={styles.section}>Tools</Text>
        <GroupedList>
          <ListRow
            icon="water"
            iconColor={colors.teal}
            title="Faucet"
            subtitle="Copy address & open faucet hub"
            onPress={() => {
              if (activeAccount) Clipboard.setStringAsync(activeAccount.address);
              if (network.faucetUrl) Linking.openURL(network.faucetUrl);
            }}
          />
          <ListRow
            icon="link"
            iconColor={colors.tint}
            title="GnoConnect docs"
            onPress={() => Linking.openURL('https://docs.gno.land/resources/gnoconnect/')}
            last
          />
        </GroupedList>

        <Text style={styles.section}>About</Text>
        <GroupedList>
          <ListRow
            icon="information-circle"
            iconColor={colors.textSecondary}
            title="Version"
            value="0.1.0"
            showChevron={false}
          />
          <ListRow
            icon="open-outline"
            iconColor={colors.tint}
            title="gno.land"
            onPress={() => Linking.openURL('https://gno.land')}
          />
          <ListRow
            icon="logo-github"
            iconColor={colors.text}
            title="Adena (reference wallet)"
            onPress={() => Linking.openURL('https://adena.app')}
            last
          />
        </GroupedList>

        <Text style={styles.legal}>
          Independent open-source mobile wallet for gno.land. Inspired by Adena product scope — not
          affiliated. Designed for iPhone and iPad.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  statusLine: { ...typography.subhead, color: colors.text, flex: 1, marginRight: 8 },
  section: {
    ...typography.footnote,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 12,
  },
  legal: {
    ...typography.caption1,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  unlockBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  unlockTitle: { ...typography.headline, marginBottom: 4 },
});
