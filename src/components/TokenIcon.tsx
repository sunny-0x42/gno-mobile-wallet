import React, { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import {
  getTokenFallbackColor,
  getTokenIconSvg,
} from '@/config/tokenIcons';
import { typography } from '@/theme';

type Props = {
  symbol: string;
  size?: number;
  style?: ViewStyle;
};

function FallbackBadge({
  symbol,
  size,
  accent,
  style,
}: {
  symbol: string;
  size: number;
  accent: string;
  style?: ViewStyle;
}) {
  const label = (symbol || '?').slice(0, 2).toUpperCase();
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: accent + '33',
        },
        style,
      ]}
    >
      <Text style={[styles.fallbackText, { color: accent, fontSize: size * 0.32 }]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Token logo from bundled gno-token-resource SVGs (GnoSwap source).
 * Web: data-URI Image (reliable). Native: SvgXml when available.
 * Falls back to a colored 2-letter badge on miss / load error.
 */
export default function TokenIcon({ symbol, size = 36, style }: Props) {
  const xml = useMemo(() => getTokenIconSvg(symbol), [symbol]);
  const accent = getTokenFallbackColor(symbol);
  const [failed, setFailed] = useState(false);

  const dataUri = useMemo(() => {
    if (!xml) return null;
    // utf8 data URI works in browsers; base64 avoids some encode edge cases
    try {
      if (typeof btoa === 'function') {
        const b64 = btoa(unescape(encodeURIComponent(xml)));
        return `data:image/svg+xml;base64,${b64}`;
      }
    } catch {
      /* fall through */
    }
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  }, [xml]);

  if (!xml || failed || !dataUri) {
    return <FallbackBadge symbol={symbol} size={size} accent={accent} style={style} />;
  }

  // Web: always Image + data URI (SvgXml has caused blank-page crashes on RN web)
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.wrap,
          { width: size, height: size, borderRadius: size / 2 },
          style,
        ]}
      >
        <Image
          source={{ uri: dataUri }}
          style={{ width: size, height: size }}
          onError={() => setFailed(true)}
          accessibilityLabel={`${symbol} icon`}
        />
      </View>
    );
  }

  // Native: prefer SvgXml without static import (keeps web bundle clean)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SvgXml } = require('react-native-svg') as {
      SvgXml: React.ComponentType<{ xml: string; width: number; height: number }>;
    };
    if (SvgXml) {
      return (
        <View
          style={[
            styles.wrap,
            { width: size, height: size, borderRadius: size / 2 },
            style,
          ]}
        >
          <SvgXml xml={xml} width={size} height={size} />
        </View>
      );
    }
  } catch {
    /* use Image fallback below */
  }

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Image
        source={{ uri: dataUri }}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    ...typography.caption1,
    fontWeight: '700',
  },
});
