import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Button, Muted, NavHeader, Screen, Spacer } from '@/components/ui';
import type { RootStackParamList } from '@/router/types';
import { colors, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ShowSeed'>;

export default function ShowSeedScreen({ navigation, route }: Props) {
  const { phrase } = route.params;
  const words = phrase.trim().split(/\s+/);
  const [confirmed, setConfirmed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <Screen scroll>
      <NavHeader title="Secret Phrase" onBack={() => navigation.goBack()} large />
      <Muted>
        This is the only way to recover this wallet. Do not screenshot or share it. Prefer writing
        on paper offline.
      </Muted>

      <View style={styles.warn}>
        <Ionicons name="warning" size={18} color={colors.orange} />
        <Text style={styles.warnText}>Anyone with these words can take your funds.</Text>
      </View>

      <Pressable
        onPress={() => setRevealed(true)}
        style={styles.gridCard}
        disabled={revealed}
        accessibilityRole="button"
        accessibilityLabel="Reveal seed phrase"
      >
        {!revealed ? (
          <View style={styles.blurOverlay}>
            <Ionicons name="eye-outline" size={28} color={colors.text} />
            <Text style={styles.revealText}>Tap to reveal</Text>
          </View>
        ) : null}
        <View style={[styles.grid, !revealed && { opacity: 0.08 }]}>
          {words.map((w, i) => (
            <View key={`${w}-${i}`} style={styles.word}>
              <Text style={styles.idx}>{i + 1}</Text>
              <Text style={styles.w}>{w}</Text>
            </View>
          ))}
        </View>
      </Pressable>

      {revealed ? (
        <Button
          title="Copy Phrase"
          variant="secondary"
          icon="copy-outline"
          onPress={async () => {
            await Clipboard.setStringAsync(phrase);
            if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      ) : null}

      <Pressable
        onPress={() => {
          if (Platform.OS === 'ios') Haptics.selectionAsync();
          setConfirmed((v) => !v);
        }}
        style={styles.checkRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed }}
      >
        <View style={[styles.box, confirmed && styles.boxOn]}>
          {confirmed ? <Ionicons name="checkmark" size={16} color={colors.black} /> : null}
        </View>
        <Text style={styles.checkLabel}>I saved my recovery phrase offline</Text>
      </Pressable>

      <Spacer h={16} />
      <Button
        title="Continue"
        disabled={!confirmed || !revealed}
        size="lg"
        onPress={() => navigation.navigate('CreatePassword', { phrase })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  warnText: { ...typography.footnote, color: colors.orange, flex: 1 },
  gridCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    minHeight: 180,
    overflow: 'hidden',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 16,
    gap: 8,
  },
  revealText: { ...typography.headline },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  word: {
    width: '31%',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.bgElevated2,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  idx: { color: colors.textTertiary, fontSize: 12, minWidth: 14 },
  w: { color: colors.text, fontWeight: '600', fontSize: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.separatorOpaque,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { ...typography.body, flex: 1 },
});
