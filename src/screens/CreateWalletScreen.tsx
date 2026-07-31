import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Muted, NavHeader, Screen, Spacer } from '@/components/ui';
import type { RootStackParamList } from '@/router/types';
import { useWallet } from '@/provider/WalletProvider';
import { colors, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateWallet'>;

export default function CreateWalletScreen({ navigation }: Props) {
  const { generatePhrase } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onGenerate = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const phrase = await generatePhrase();
      if (!phrase || phrase.split(/\s+/).length < 12) {
        throw new Error('Generated phrase was empty — try again');
      }
      navigation.navigate('ShowSeed', { phrase });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <NavHeader title="Create Wallet" onBack={() => navigation.goBack()} large />
      <Muted>
        We will generate a recovery phrase. Write it down offline — anyone with the phrase can spend
        your funds.
      </Muted>

      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="key-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.cardTitle}>Recovery phrase</Text>
        <Text style={styles.cardBody}>
          12 or 24 words unique to your wallet. Compatible with Adena and gnokey on gno.land.
        </Text>
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Spacer h={24} />
      <Button title="Generate Recovery Phrase" icon="sparkles" onPress={onGenerate} loading={loading} size="lg" />
      <Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: { ...typography.headline, marginBottom: 8 },
  cardBody: { ...typography.subhead, textAlign: 'center', lineHeight: 20 },
  err: { ...typography.footnote, color: colors.danger, marginTop: 16, textAlign: 'center' },
});
