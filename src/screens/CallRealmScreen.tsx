import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, Muted, NavHeader, Screen, Spacer } from '@/components/ui';
import { useWallet } from '@/provider/WalletProvider';
import type { RootStackParamList } from '@/router/types';
import { colors, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CallRealm'>;

export default function CallRealmScreen({ navigation, route }: Props) {
  const { callRealm, network } = useWallet();
  const [pkgPath, setPkgPath] = useState(route.params?.pkgPath ?? 'gno.land/r/demo/counter');
  const [func, setFunc] = useState(route.params?.func ?? 'Inc');
  const [argsText, setArgsText] = useState((route.params?.args ?? []).join(', '));
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const onCall = async () => {
    setError(undefined);
    setResult('');
    setLoading(true);
    try {
      const args = argsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await callRealm(pkgPath.trim(), func.trim(), args);
      setResult(res.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <NavHeader title="Call Realm" onBack={() => navigation.goBack()} large />
      <Muted>
        Sign a VM call on {network.chainId}. Foundation for dApp approvals and GnoConnect.
      </Muted>
      <Input
        label="Package path"
        placeholder="gno.land/r/…"
        value={pkgPath}
        onChangeText={setPkgPath}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Input
        label="Function"
        placeholder="Inc"
        value={func}
        onChangeText={setFunc}
        autoCapitalize="none"
      />
      <Input
        label="Arguments"
        placeholder="comma-separated"
        value={argsText}
        onChangeText={setArgsText}
        autoCapitalize="none"
        error={error}
      />
      <Spacer h={8} />
      <Button title="Sign & Broadcast" icon="paper-plane" size="lg" onPress={onCall} loading={loading} />
      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Result</Text>
          <Text style={styles.result}>{result}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  resultBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  resultLabel: { ...typography.caption1, marginBottom: 6 },
  result: { ...typography.mono, color: colors.primary, fontSize: 12, lineHeight: 18 },
});
