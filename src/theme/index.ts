import { Platform, StyleSheet } from 'react-native';

/** Apple-inspired dark system palette for Gno wallet */
export const colors = {
  // System backgrounds (iOS dark)
  bg: '#000000',
  bgGrouped: '#000000',
  bgElevated: '#1C1C1E',
  bgElevated2: '#2C2C2E',
  bgElevated3: '#3A3A3C',
  bgInput: '#1C1C1E',
  bgSecondary: '#2C2C2E',

  // Separators
  separator: 'rgba(84, 84, 88, 0.65)',
  separatorOpaque: '#38383A',
  border: 'rgba(84, 84, 88, 0.45)',

  // Labels
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  textMuted: 'rgba(235, 235, 245, 0.55)',
  textOnPrimary: '#FFFFFF',

  // Brand / accents (Gno green + iOS system)
  primary: '#30D158', // iOS system green
  primaryPressed: '#28B84C',
  tint: '#0A84FF', // iOS system blue
  orange: '#FF9F0A',
  red: '#FF453A',
  yellow: '#FFD60A',
  purple: '#BF5AF2',
  teal: '#64D2FF',

  danger: '#FF453A',
  warning: '#FF9F0A',
  success: '#30D158',
  info: '#0A84FF',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.45)',
  fill: 'rgba(120, 120, 128, 0.24)',
  fillSecondary: 'rgba(120, 120, 128, 0.18)',

  // Tab bar
  tabBar: 'rgba(28, 28, 30, 0.94)',
  tabInactive: 'rgba(235, 235, 245, 0.45)',
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
};

/** SF Pro-like type scale (iOS Human Interface) */
export const typography = StyleSheet.create({
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
    color: colors.text,
    ...Platform.select({ ios: { fontFamily: 'System' }, default: {} }),
  },
  title1: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.36,
    color: colors.text,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.35,
    color: colors.text,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.38,
    color: colors.text,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
    color: colors.text,
  },
  body: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
    color: colors.text,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.32,
    color: colors.text,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.24,
    color: colors.textSecondary,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
    color: colors.textSecondary,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textTertiary,
  },
  mono: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.text,
  },
});

export const shadows = Platform.select({
  ios: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    fab: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
    },
  },
  default: {
    card: { elevation: 2 },
    fab: { elevation: 4 },
  },
})!;

export const layout = {
  maxContentWidth: 560, // readable column on iPad
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
};
