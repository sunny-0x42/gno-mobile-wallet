import React, { useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { Button, Muted, NavHeader, Screen, Spacer } from '@/components/ui';
import { useWallet } from '@/provider/WalletProvider';
import type { RootStackParamList } from '@/router/types';
import { colors, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>;

export default function ReceiveScreen({ navigation }: Props) {
  const { activeAccount, network } = useWallet();
  const address = activeAccount?.address ?? '';
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(address);
    if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    await Share.share({
      message: address,
      title: 'Gno address',
    });
  };

  return (
    <Screen scroll>
      <NavHeader title="Receive" onBack={() => navigation.goBack()} large />
      <Muted center>
        Only send GNOT / Gno assets on {network.name}. Wrong network transfers may be lost.
      </Muted>

      <View style={styles.card}>
        <View style={styles.qrWrap}>
          {address ? (
            <View style={styles.qrPad}>
              <QRCode
                value={address}
                size={200}
                backgroundColor="#FFFFFF"
                color="#000000"
              />
            </View>
          ) : null}
        </View>
        <Text style={styles.name}>{activeAccount?.name}</Text>
        <Text style={styles.addr} selectable>
          {address}
        </Text>
      </View>

      <Spacer h={8} />
      <Button
        title={copied ? 'Copied' : 'Copy Address'}
        icon={copied ? 'checkmark' : 'copy-outline'}
        size="lg"
        onPress={copy}
      />
      <Button title="Share" variant="secondary" icon="share-outline" onPress={share} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  qrWrap: { marginBottom: 20 },
  qrPad: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  name: { ...typography.headline, marginBottom: 8 },
  addr: {
    ...typography.mono,
    textAlign: 'center',
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
