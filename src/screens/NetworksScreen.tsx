import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Muted, NavHeader, Screen, Spacer } from '@/components/ui';
import { useWallet } from '@/provider/WalletProvider';
import type { RootStackParamList } from '@/router/types';
import { colors, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Networks'>;

export default function NetworksScreen({ navigation }: Props) {
  const { networks, network, switchNetwork, addCustomNetwork } = useWallet();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [chainId, setChainId] = useState('');
  const [remote, setRemote] = useState('');

  const onAdd = async () => {
    if (!name || !chainId || !remote) return;
    const id = name.toLowerCase().replace(/\s+/g, '-');
    await addCustomNetwork({
      id,
      name,
      chainId,
      remote,
      isTestnet: true,
    });
    setShowAdd(false);
    setName('');
    setChainId('');
    setRemote('');
  };

  return (
    <Screen scroll>
      <NavHeader title="Networks" onBack={() => navigation.goBack()} large />
      <Muted>Choose a gno.land network. Default is Topaz (topaz-1).</Muted>

      <View style={styles.list}>
        {networks.map((n, i) => {
          const active = n.id === network.id;
          return (
            <Pressable
              key={n.id}
              onPress={() => switchNetwork(n.id)}
              style={({ pressed }) => [
                styles.row,
                i < networks.length - 1 && styles.border,
                pressed && { opacity: 0.6 },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: n.isTestnet ? colors.orange : colors.success },
                ]}
              />
              <View style={styles.meta}>
                <Text style={styles.name}>{n.name}</Text>
                <Text style={styles.sub}>{n.chainId}</Text>
                <Text style={styles.remote} numberOfLines={1}>
                  {n.remote}
                </Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Spacer h={16} />
      {!showAdd ? (
        <Button
          title="Add Custom RPC"
          variant="secondary"
          icon="add"
          onPress={() => setShowAdd(true)}
        />
      ) : (
        <>
          <Input label="Name" placeholder="My node" value={name} onChangeText={setName} />
          <Input
            label="Chain ID"
            placeholder="dev"
            value={chainId}
            onChangeText={setChainId}
            autoCapitalize="none"
          />
          <Input
            label="RPC URL"
            placeholder="https://…"
            value={remote}
            onChangeText={setRemote}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button title="Save Network" icon="save-outline" onPress={onAdd} />
          <Button title="Cancel" variant="ghost" onPress={() => setShowAdd(false)} />
        </>
      )}
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
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  meta: { flex: 1 },
  name: { ...typography.headline, fontSize: 16 },
  sub: { ...typography.footnote, marginTop: 2 },
  remote: { ...typography.caption2, marginTop: 2 },
});
