import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Muted, NavHeader, Screen, Spacer } from '@/components/ui';
import { useWallet } from '@/provider/WalletProvider';
import type { RootStackParamList } from '@/router/types';
import { colors, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DeepLinkConfirm'>;

export default function DeepLinkConfirmScreen({ navigation, route }: Props) {
  const { callRealm, network } = useWallet();
  const { pkgPath, func, args = [] } = route.params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState('');

  const onConfirm = async () => {
    if (!pkgPath || !func) {
      setError('Missing package or function');
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const res = await callRealm(pkgPath, func, args);
      setResult(res.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <NavHeader title="Confirm" onBack={() => navigation.goBack()} large />
      <Muted>GnoConnect / deep-link request on {network.chainId}</Muted>

      <View style={styles.card}>
        <Field label="Package" value={pkgPath ?? '—'} />
        <Field label="Function" value={func ?? '—'} />
        <Field label="Args" value={args.length ? args.join(', ') : '(none)'} />
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}
      {result ? <Text style={styles.ok}>{result}</Text> : null}

      <Spacer h={16} />
      <Button title="Approve" icon="checkmark-circle" size="lg" onPress={onConfirm} loading={loading} />
      <Button title="Reject" variant="danger" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.k}>{label}</Text>
      <Text style={styles.v}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    padding: 16,
  },
  field: { marginBottom: 12 },
  k: { ...typography.caption1, marginBottom: 4 },
  v: { ...typography.mono, fontSize: 14 },
  err: { ...typography.footnote, color: colors.danger, marginTop: 12 },
  ok: { ...typography.mono, color: colors.success, marginTop: 12, fontSize: 12 },
});
