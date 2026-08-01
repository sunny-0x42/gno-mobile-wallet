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
import { alertAsync, confirmAsync } from '@/utils/dialog';

export default function SettingsScreen() {
  const { navigateRoot } = useRootNavigation();
  const {
    network,
    isMock,
    isUnlocked,
    activeAccount,
    unlockAccount,
    passkeyEnabled,
    passkeyMeta,
    passkeySupport,
    enablePasskey,
    disablePasskey,
  } = useWallet();

  const [pwd, setPwd] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockErr, setUnlockErr] = useState<string | undefined>();

  const [pkPwd, setPkPwd] = useState('');
  const [pkBusy, setPkBusy] = useState(false);
  const [pkErr, setPkErr] = useState<string | undefined>();

  const onUnlock = async () => {
    if (!activeAccount) return;
    setUnlocking(true);
    setUnlockErr(undefined);
    try {
      await unlockAccount(activeAccount.name, pwd);
      setPwd('');
      const extra = passkeyEnabled
        ? ' Password and device passkey verified.'
        : '';
      await alertAsync(
        'Unlocked',
        `You can send, swap, and call realms until you close the tab.${extra}`,
      );
    } catch (e) {
      setUnlockErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUnlocking(false);
    }
  };

  const onEnablePasskey = async () => {
    setPkBusy(true);
    setPkErr(undefined);
    try {
      if (pkPwd.length < 8) {
        throw new Error('Enter your wallet password to enable passkey (min 8 characters)');
      }
      await enablePasskey(pkPwd);
      setPkPwd('');
      await alertAsync(
        'Passkey enabled',
        'Unlock now requires your password and this device’s biometric / PIN (Windows Hello, Face ID, Touch ID, etc.).',
      );
    } catch (e) {
      setPkErr(e instanceof Error ? e.message : String(e));
    } finally {
      setPkBusy(false);
    }
  };

  const onDisablePasskey = async () => {
    const ok = await confirmAsync(
      'Disable passkey?',
      'Unlock will only require your password. You can re-enable passkey anytime on this device.',
    );
    if (!ok) return;
    setPkBusy(true);
    setPkErr(undefined);
    try {
      if (pkPwd.length < 8) {
        throw new Error('Enter your wallet password to disable passkey');
      }
      await disablePasskey(pkPwd);
      setPkPwd('');
      await alertAsync('Passkey disabled', 'Password-only unlock is restored.');
    } catch (e) {
      setPkErr(e instanceof Error ? e.message : String(e));
    } finally {
      setPkBusy(false);
    }
  };

  const passkeySupported = passkeySupport?.supported === true;
  const passkeyBlockedReason = passkeySupport && !passkeySupport.supported ? passkeySupport.reason : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <Text style={typography.largeTitle}>Settings</Text>
        <Muted>Wallet, security, network, and about.</Muted>

        <View style={styles.status}>
          <Text style={styles.statusLine}>
            {network.name} · {network.chainId}
          </Text>
          <View style={styles.badges}>
            <Badge
              label={isMock ? 'Fake mock' : isUnlocked ? 'Unlocked' : 'Locked'}
              tone={isMock ? 'warn' : isUnlocked ? 'ok' : 'warn'}
            />
            {!isMock && passkeyEnabled ? (
              <Badge label="Passkey" tone="ok" />
            ) : null}
          </View>
        </View>

        {!isMock && activeAccount && !isUnlocked ? (
          <View style={styles.unlockBox}>
            <Text style={styles.unlockTitle}>Unlock wallet</Text>
            <Muted>
              Enter the password you set when creating/importing this account.
              {passkeyEnabled
                ? ' Then confirm with your device passkey (biometric / PIN).'
                : ''}
            </Muted>
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={pwd}
              onChangeText={setPwd}
              error={unlockErr}
            />
            <Button
              title={
                unlocking
                  ? passkeyEnabled
                    ? 'Verifying…'
                    : 'Unlocking…'
                  : passkeyEnabled
                    ? 'Unlock with password + passkey'
                    : 'Unlock'
              }
              icon={passkeyEnabled ? 'finger-print' : 'lock-open'}
              onPress={onUnlock}
              loading={unlocking}
            />
          </View>
        ) : null}

        {!isMock && activeAccount ? (
          <>
            <Text style={styles.section}>Security</Text>
            <View style={styles.securityBox}>
              <Text style={styles.unlockTitle}>Device passkey</Text>
              <Muted>
                Adds a second factor on this device (WebAuthn platform authenticator). Your seed stays
                encrypted with the password; the passkey only gates unlock.
              </Muted>
              <View style={styles.pkStatus}>
                <Text style={styles.pkStatusLabel}>Status</Text>
                <Badge
                  label={
                    passkeyEnabled
                      ? 'Enabled'
                      : passkeySupported
                        ? 'Not enabled'
                        : 'Unavailable'
                  }
                  tone={passkeyEnabled ? 'ok' : passkeySupported ? 'warn' : 'warn'}
                />
              </View>
              {passkeyEnabled && passkeyMeta ? (
                <Text style={styles.pkMeta}>
                  Registered {new Date(passkeyMeta.createdAt).toLocaleString()} · {passkeyMeta.rpId}
                </Text>
              ) : null}
              {passkeyBlockedReason ? (
                <Text style={styles.pkWarn}>{passkeyBlockedReason}</Text>
              ) : null}

              <Input
                label="Password (required to change passkey)"
                placeholder="••••••••"
                secureTextEntry
                value={pkPwd}
                onChangeText={setPkPwd}
                error={pkErr}
              />

              {passkeyEnabled ? (
                <Button
                  title="Disable passkey"
                  icon="close-circle"
                  variant="danger"
                  onPress={onDisablePasskey}
                  loading={pkBusy}
                />
              ) : (
                <Button
                  title="Enable device passkey"
                  icon="finger-print"
                  onPress={onEnablePasskey}
                  loading={pkBusy}
                  disabled={!passkeySupported || isMock}
                />
              )}
            </View>
          </>
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
            title="Source on GitHub"
            onPress={() =>
              Linking.openURL('https://github.com/sunny-0x42/gno-mobile-wallet')
            }
            last
          />
        </GroupedList>

        <Text style={styles.legal}>
          Independent open-source wallet for gno.land. Seed encryption uses your password; optional
          device passkeys add a second unlock factor on supported browsers (HTTPS).
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
    gap: 8,
  },
  statusLine: { ...typography.subhead, color: colors.text, flex: 1, marginRight: 8 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
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
  securityBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  unlockTitle: { ...typography.headline, marginBottom: 4 },
  pkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  pkStatusLabel: { ...typography.subhead },
  pkMeta: { ...typography.caption2, marginBottom: 8 },
  pkWarn: { ...typography.caption1, color: colors.orange, marginBottom: 8, lineHeight: 18 },
});
