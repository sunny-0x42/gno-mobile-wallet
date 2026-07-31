import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, Muted, NavHeader, Screen, Spacer } from '@/components/ui';
import type { RootStackParamList } from '@/router/types';
import { useWallet } from '@/provider/WalletProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePassword'>;

export default function CreatePasswordScreen({ navigation, route }: Props) {
  const { phrase } = route.params;
  const { createAccount } = useWallet();
  const [name, setName] = useState('main');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    setError(undefined);
    if (!name.trim()) return setError('Account name required');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await createAccount(name.trim(), phrase, password);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <NavHeader title="Secure Wallet" onBack={() => navigation.goBack()} large />
      <Muted>This password unlocks your keyring on this device. It is not a recovery method.</Muted>
      <Input
        label="Account name"
        placeholder="e.g. main"
        autoCapitalize="none"
        autoCorrect={false}
        value={name}
        onChangeText={setName}
      />
      <Input
        label="Password"
        placeholder="Min. 8 characters"
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <Input
        label="Confirm password"
        placeholder="Re-enter password"
        secureTextEntry
        textContentType="newPassword"
        value={confirm}
        onChangeText={setConfirm}
        error={error}
      />
      <Spacer h={16} />
      <Button title="Create Account" icon="checkmark-circle" size="lg" onPress={onSave} loading={loading} />
    </Screen>
  );
}
