import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, EmptyState, Input, Muted, NavHeader, Screen, Spacer } from '@/components/ui';
import { useWallet } from '@/provider/WalletProvider';
import type { RootStackParamList } from '@/router/types';
import { colors, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Tokens'>;

export default function TokensScreen({ navigation }: Props) {
  const { tokens, network, addToken, removeToken } = useWallet();
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [pkgPath, setPkgPath] = useState('');
  const [decimals, setDecimals] = useState('6');

  const onAdd = async () => {
    if (!symbol || !pkgPath) return;
    await addToken({
      id: `${network.id}:${pkgPath}`,
      symbol: symbol.toUpperCase(),
      name: name || symbol,
      pkgPath,
      decimals: Number(decimals) || 6,
      networkId: network.id,
    });
    setSymbol('');
    setName('');
    setPkgPath('');
  };

  const visible = tokens.filter((t) => t.networkId === network.id);

  return (
    <Screen scroll>
      <NavHeader title="Tokens" onBack={() => navigation.goBack()} large />
      <Muted>Track custom tokens on {network.name}.</Muted>

      {visible.length === 0 ? (
        <EmptyState
          icon="pricetag-outline"
          title="No custom tokens"
          message="Add a package path for GR20-style tokens."
        />
      ) : (
        <View style={styles.list}>
          {visible.map((t, i) => (
            <View
              key={t.id}
              style={[styles.row, i < visible.length - 1 && styles.border]}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t.symbol.slice(0, 3)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sym}>
                  {t.symbol} · {t.name}
                </Text>
                <Text style={styles.path} numberOfLines={1}>
                  {t.pkgPath}
                </Text>
              </View>
              <Button title="Remove" variant="danger" size="sm" onPress={() => removeToken(t.id)} />
            </View>
          ))}
        </View>
      )}

      <Spacer h={16} />
      <Text style={styles.section}>Add token</Text>
      <Input label="Symbol" placeholder="TOKEN" value={symbol} onChangeText={setSymbol} autoCapitalize="characters" />
      <Input label="Name" placeholder="My Token" value={name} onChangeText={setName} />
      <Input
        label="Package path"
        placeholder="gno.land/r/…"
        value={pkgPath}
        onChangeText={setPkgPath}
        autoCapitalize="none"
      />
      <Input label="Decimals" placeholder="6" value={decimals} onChangeText={setDecimals} keyboardType="number-pad" />
      <Button title="Add Token" icon="add-circle" onPress={onAdd} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.purple + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typography.caption1, color: colors.purple, fontWeight: '700' },
  sym: { ...typography.headline, fontSize: 15 },
  path: { ...typography.caption2, marginTop: 2 },
  section: {
    ...typography.footnote,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
});
