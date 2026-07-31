import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, Muted } from '@/components/ui';
import { useWallet } from '@/provider/WalletProvider';
import { colors, spacing, typography } from '@/theme';
import { formatCoinAmount, shortAddress } from '@/utils/format';

export default function HistoryScreen() {
  const { history } = useWallet();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.largeTitle}>Activity</Text>
        <Muted>Transactions signed on this device.</Muted>
      </View>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="No activity yet"
            message="Sends and realm calls will show up here."
          />
        }
        renderItem={({ item }) => {
          const icon =
            item.type === 'send' ? 'arrow-up-circle' : item.type === 'call' ? 'code-slash' : 'ellipse';
          const color =
            item.status === 'success'
              ? colors.success
              : item.status === 'failed'
                ? colors.danger
                : colors.orange;
          return (
            <View style={styles.card}>
              <View style={[styles.icon, { backgroundColor: color + '33' }]}>
                <Ionicons name={icon as 'arrow-up-circle'} size={22} color={color} />
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>
                  {item.type === 'send' ? 'Send' : item.type === 'call' ? 'Realm call' : 'Tx'} ·{' '}
                  <Text style={{ color }}>{item.status}</Text>
                </Text>
                {item.amount ? (
                  <Text style={styles.amount}>{formatCoinAmount(item.amount)}</Text>
                ) : null}
                {item.to ? (
                  <Text style={styles.meta}>To {shortAddress(item.to)}</Text>
                ) : null}
                {item.pkgPath ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.pkgPath}.{item.func}
                  </Text>
                ) : null}
                {item.error ? <Text style={styles.err}>{item.error}</Text> : null}
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { ...typography.headline, fontSize: 15 },
  amount: { ...typography.body, color: colors.primary, marginTop: 2 },
  meta: { ...typography.footnote, marginTop: 2 },
  err: { ...typography.caption1, color: colors.danger, marginTop: 4 },
  time: { ...typography.caption2, marginTop: 6 },
});
