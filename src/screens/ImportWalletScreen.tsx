import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, Muted, NavHeader, Screen, Spacer } from '@/components/ui';
import SecureContextBanner from '@/components/SecureContextBanner';
import type { RootStackParamList } from '@/router/types';
import { useWallet } from '@/provider/WalletProvider';
import { normalizeMnemonic } from '@/utils/mnemonic';
import { assertCanCreateVault } from '@/utils/secureContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ImportWallet'>;

export default function ImportWalletScreen({ navigation }: Props) {
  const { importAccount } = useWallet();
  const [phrase, setPhrase] = useState('');
  const [name, setName] = useState('imported');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const wordCount = phrase.trim() ? normalizeMnemonic(phrase).split(' ').filter(Boolean).length : 0;

  const onImport = async () => {
    setError(undefined);
    const normalized = normalizeMnemonic(phrase);
    const words = normalized.split(' ').filter(Boolean);
    if (words.length < 12) {
      return setError(`Enter a 12 or 24 word phrase (currently ${words.length} words after clean-up).`);
    }
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      assertCanCreateVault();
      await importAccount(name.trim() || 'imported', normalized, password);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <NavHeader title="Import Wallet" onBack={() => navigation.goBack()} large />
      <SecureContextBanner />
      <Muted>
        Paste 12 or 24 English BIP39 words from Adena / gnokey. Spaces/newlines are cleaned
        automatically. Word count: {wordCount || 0}.
      </Muted>
      <Input
        label="Seed phrase"
        placeholder="word1 word2 word3 …"
        value={phrase}
        onChangeText={setPhrase}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        textContentType="none"
        style={{ minHeight: 100, textAlignVertical: 'top' }}
      />
      <Input
        label="Account name"
        placeholder="e.g. imported"
        autoCapitalize="none"
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
        value={confirm}
        onChangeText={setConfirm}
        error={error}
      />
      <Spacer h={16} />
      <Button title="Import Wallet" icon="download" size="lg" onPress={onImport} loading={loading} />
    </Screen>
  );
}
