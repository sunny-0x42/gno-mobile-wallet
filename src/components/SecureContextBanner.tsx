import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { insecureContextReason } from '@/utils/secureContext';
import { colors, typography } from '@/theme';

/** Shown when vault crypto is unsafe (plain HTTP / no Web Crypto). */
export default function SecureContextBanner() {
  const reason = insecureContextReason();
  if (!reason) return null;
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.title}>Insecure page</Text>
      <Text style={styles.body}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.danger + '22',
    borderColor: colors.danger + '88',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  title: { ...typography.headline, fontSize: 15, color: colors.danger, marginBottom: 4 },
  body: { ...typography.caption1, color: colors.textSecondary, lineHeight: 18 },
});
