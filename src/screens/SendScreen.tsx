import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Button, Input, Muted, NavHeader, Screen, Spacer } from '@/components/ui';
import { useWallet } from '@/provider/WalletProvider';
import type { RootStackParamList } from '@/router/types';
import { colors, typography } from '@/theme';
import { alertAsync, confirmAsync } from '@/utils/dialog';
import { isLikelyG1Address } from '@/utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Send'>;

export default function SendScreen({ navigation }: Props) {
  const { sendGnot, network, activeAccount, isUnlocked, isMock } = useWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    setError(undefined);
    if (!activeAccount) return setError('No active account');
    if (!isLikelyG1Address(to) && !to.startsWith('g1mock')) {
      return setError('Enter a valid g1 address');
    }
    if (!amount || Number(amount) <= 0) return setError('Enter amount in GNOT');
    if (!isUnlocked && !isMock) {
      return setError('Wallet locked — unlock in Settings with your password first.');
    }

    const ok = await confirmAsync(
      'Confirm Send',
      `Send ${amount} GNOT to\n${to.trim()}\n\non ${network.name} (${network.chainId})?`,
    );
    if (!ok) return;

    setLoading(true);
    try {
      const tx = await sendGnot(to.trim(), amount, memo || undefined);
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(
          tx.status === 'success'
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error,
        );
      }
      await alertAsync(
        tx.status === 'success' ? 'Sent' : 'Failed',
        tx.status === 'success'
          ? `Broadcast on ${network.chainId}${tx.hash ? `\n${tx.hash}` : ''}`
          : tx.error ?? 'Transaction failed',
      );
      if (tx.status === 'success') navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <NavHeader title="Send" onBack={() => navigation.goBack()} large />
      <Muted>
        Network: {network.name} ({network.chainId}). Default network fee applies.
      </Muted>

      <View style={styles.from}>
        <Text style={styles.fromLabel}>From</Text>
        <Text style={styles.fromValue}>{activeAccount?.name ?? '—'}</Text>
        <Text style={styles.fromAddr} numberOfLines={1}>
          {activeAccount?.address}
        </Text>
      </View>

      <Input
        label="Recipient"
        placeholder="g1…"
        autoCapitalize="none"
        autoCorrect={false}
        value={to}
        onChangeText={setTo}
      />
      <Input
        label="Amount (GNOT)"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <Input label="Memo" placeholder="Optional" value={memo} onChangeText={setMemo} error={error} />
      <Spacer h={16} />
      <Button title="Review & Send" icon="arrow-up-circle" size="lg" onPress={onSend} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  from: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  fromLabel: { ...typography.caption1, marginBottom: 4 },
  fromValue: { ...typography.headline },
  fromAddr: { ...typography.mono, color: colors.textSecondary, marginTop: 4 },
});
