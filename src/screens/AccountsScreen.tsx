import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, EmptyState, Muted, NavHeader, Screen, Spacer } from '@/components/ui';
import { useWallet } from '@/provider/WalletProvider';
import type { RootStackParamList } from '@/router/types';
import { colors, typography } from '@/theme';
import { shortAddress } from '@/utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Accounts'>;

export default function AccountsScreen({ navigation }: Props) {
  const { accounts, activeAccount, setActiveAccountByName, removeAccount } = useWallet();

  const confirmRemove = (name: string) => {
    Alert.alert('Remove Account', `Remove “${name}” from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeAccount(name),
      },
    ]);
  };

  return (
    <Screen scroll>
      <NavHeader title="Accounts" onBack={() => navigation.goBack()} large />
      <Muted>Switch between accounts stored on this device. Multi-account parity with Adena.</Muted>

      {accounts.length === 0 ? (
        <EmptyState icon="people-outline" title="No accounts" message="Create or import a wallet." />
      ) : (
        <View style={styles.list}>
          {accounts.map((a, i) => {
            const active = a.name === activeAccount?.name;
            return (
              <Pressable
                key={a.name}
                onPress={() => setActiveAccountByName(a.name)}
                style={({ pressed }) => [
                  styles.row,
                  i < accounts.length - 1 && styles.rowBorder,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <View style={[styles.avatar, active && styles.avatarActive]}>
                  <Text style={styles.avatarText}>{(a.name[0] || 'A').toUpperCase()}</Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.name}>
                    {a.name}
                    {active ? '  · Active' : ''}
                  </Text>
                  <Text style={styles.addr}>{shortAddress(a.address, 12, 8)}</Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : (
                  <Pressable onPress={() => confirmRemove(a.name)} hitSlop={12}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <Spacer h={20} />
      <Button title="Create Another" icon="add" onPress={() => navigation.navigate('CreateWallet')} />
      <Button
        title="Import Another"
        variant="secondary"
        icon="download-outline"
        onPress={() => navigation.navigate('ImportWallet')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgElevated2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: {
    backgroundColor: 'rgba(48, 209, 88, 0.2)',
  },
  avatarText: { ...typography.headline, fontSize: 16 },
  meta: { flex: 1 },
  name: { ...typography.headline, fontSize: 16 },
  addr: { ...typography.mono, color: colors.textSecondary, marginTop: 2 },
});
