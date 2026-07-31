import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, layout, radius, spacing, typography } from '@/theme';

// ─── Layout ──────────────────────────────────────────────────────────────────

export function Screen({
  children,
  scroll,
  padded = true,
  style,
  edges = ['top', 'left', 'right'],
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const { width } = useWindowDimensions();
  const isPad = width >= 768;
  const content = (
    <View
      style={[
        padded && styles.pad,
        isPad && styles.padCenter,
        isPad && { maxWidth: layout.maxContentWidth, alignSelf: 'center', width: '100%' },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function NavHeader({
  title,
  subtitle,
  onBack,
  right,
  large,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  large?: boolean;
}) {
  return (
    <View style={styles.navHeader}>
      <View style={styles.navRow}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={layout.hitSlop}
            style={({ pressed }) => [styles.navBack, pressed && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={28} color={colors.tint} />
            <Text style={styles.navBackText}>Back</Text>
          </Pressable>
        ) : (
          <View style={{ width: 72 }} />
        )}
        {!large ? <Text style={styles.navTitleCenter}>{title}</Text> : <View style={{ flex: 1 }} />}
        <View style={styles.navRight}>{right ?? <View style={{ width: 72 }} />}</View>
      </View>
      {large ? (
        <View style={styles.largeTitleWrap}>
          <Text style={typography.largeTitle}>{title}</Text>
          {subtitle ? <Text style={[typography.subhead, { marginTop: 4 }]}>{subtitle}</Text> : null}
        </View>
      ) : subtitle ? (
        <Text style={[typography.footnote, { textAlign: 'center', marginTop: 2 }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

// ─── Typography ──────────────────────────────────────────────────────────────

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={[typography.largeTitle, { marginBottom: spacing.xs }]}>{children}</Text>;
}

export function Headline({ children }: { children: React.ReactNode }) {
  return <Text style={[typography.title2, { marginBottom: spacing.xs }]}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={[typography.headline, { marginBottom: spacing.xxs }]}>{children}</Text>;
}

export function Muted({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <Text style={[typography.subhead, { marginBottom: spacing.md, textAlign: center ? 'center' : 'left' }]}>
      {children}
    </Text>
  );
}

// ─── Surfaces ────────────────────────────────────────────────────────────────

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function GroupedList({ children }: { children: React.ReactNode }) {
  return <View style={styles.grouped}>{children}</View>;
}

export function ListRow({
  title,
  subtitle,
  value,
  icon,
  iconColor = colors.tint,
  onPress,
  destructive,
  showChevron = true,
  last,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.listRow, !last && styles.listRowBorder]}>
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: iconColor }]}>
          <Ionicons name={icon} size={18} color={colors.white} />
        </View>
      ) : null}
      <View style={styles.listTextCol}>
        <Text style={[typography.body, destructive && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={typography.footnote}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[typography.body, { color: colors.textSecondary }]}>{value}</Text> : null}
      {onPress && showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: 4 }} />
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => pressed && { opacity: 0.55 }}
      accessibilityRole="button"
    >
      {body}
    </Pressable>
  );
}

// ─── Controls ────────────────────────────────────────────────────────────────

export function Input(props: TextInputProps & { error?: string; label?: string }) {
  const { error, label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: spacing.sm }}>
      {label ? <Text style={[typography.footnote, styles.inputLabel]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        {...rest}
        style={[styles.input, error ? styles.inputError : null, style]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  size = 'md',
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'tinted';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md' | 'lg';
}) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary' || variant === 'tinted'
          ? colors.fill
          : 'transparent';
  const color =
    variant === 'primary'
      ? colors.black
      : variant === 'danger'
        ? colors.white
        : variant === 'tinted'
          ? colors.tint
          : colors.tint;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === 'ios' && !disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        size === 'sm' && styles.btnSm,
        size === 'lg' && styles.btnLg,
        { backgroundColor: bg },
        variant === 'ghost' && styles.btnGhost,
        (disabled || loading) && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.75, transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.btnInner}>
          {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
          <Text style={[styles.btnText, { color }, size === 'sm' && { fontSize: 15 }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  color = colors.tint,
  size = 24,
  label,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  size?: number;
  label?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.selectionAsync();
        onPress();
      }}
      hitSlop={layout.hitSlop}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.5 }]}
      accessibilityRole="button"
      accessibilityLabel={label ?? name}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'info',
}: {
  label: string;
  tone?: 'info' | 'warn' | 'ok' | 'neutral';
}) {
  const bg =
    tone === 'warn'
      ? colors.orange
      : tone === 'ok'
        ? colors.success
        : tone === 'neutral'
          ? colors.fill
          : colors.tint;
  const fg = tone === 'neutral' ? colors.text : colors.black;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Spacer({ h = spacing.sm }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function EmptyState({
  icon = 'wallet-outline',
  title,
  message,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={40} color={colors.textTertiary} />
      </View>
      <Text style={[typography.headline, { textAlign: 'center' }]}>{title}</Text>
      {message ? (
        <Text style={[typography.subhead, { textAlign: 'center', marginTop: 6 }]}>{message}</Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.lg, width: '100%' }}>{action}</View> : null}
    </View>
  );
}

export function ActionTile({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.actionTile, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={22} color={colors.white} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

export function useBottomPad(extra = 0) {
  const insets = useSafeAreaInsets();
  return insets.bottom + extra;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  pad: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  padCenter: {
    paddingHorizontal: spacing.xxl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
  navHeader: {
    marginBottom: spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  navBack: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 72,
    marginLeft: -8,
  },
  navBackText: {
    color: colors.tint,
    fontSize: 17,
    marginLeft: -4,
  },
  navTitleCenter: {
    ...typography.headline,
    flex: 1,
    textAlign: 'center',
  },
  navRight: {
    minWidth: 72,
    alignItems: 'flex-end',
  },
  largeTitleWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  grouped: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    backgroundColor: colors.bgElevated,
  },
  listRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  listIcon: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listTextCol: {
    flex: 1,
  },
  inputLabel: {
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    color: colors.text,
    fontSize: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separatorOpaque,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    marginTop: 6,
    marginLeft: 4,
    fontSize: 13,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    minHeight: 50,
  },
  btnSm: {
    paddingVertical: 10,
    minHeight: 40,
    borderRadius: radius.sm,
  },
  btnLg: {
    paddingVertical: 17,
    minHeight: 56,
    borderRadius: radius.lg,
  },
  btnGhost: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  actionTile: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.caption1,
    color: colors.text,
    fontWeight: '500',
  },
});
