import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle, TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

/** Reusable brand gradient surface (teal → cyan). */
export const GradientView = ({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) => {
  const { colors } = useTheme();
  return (
    <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
};

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return <View style={[s.card, style]}>{children}</View>;
};

export const PrimaryButton = ({
  title, onPress, loading, disabled, variant = 'primary',
}: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'outline';
}) => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const onPrimaryText = '#FFFFFF';

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[s.btn, s.btnOutline, (disabled || loading) && { opacity: 0.55 }]}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={[s.btnText, { color: colors.primary }]}>{title}</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={disabled || loading} style={[s.btnShadow, (disabled || loading) && { opacity: 0.55 }]}>
      <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
        {loading ? <ActivityIndicator color={onPrimaryText} /> : <Text style={[s.btnText, { color: onPrimaryText }]}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export const Badge = ({ status }: { status: string }) => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const map: Record<string, string> = {
    DELIVERED: colors.success, PAID: colors.success, SUCCESS: colors.success, ACTIVE: colors.success,
    PENDING: colors.warning, PARTIALLY_PAID: colors.warning, PROCESSING: colors.accent, ACCEPTED: colors.accent,
    CANCELLED: colors.error, FAILED: colors.error, OVERDUE: colors.error,
  };
  const c = map[status] ?? colors.textMuted;
  return (
    <View style={[s.badge, { backgroundColor: c + '22', borderColor: c + '55' }]}>
      <Text style={[s.badgeText, { color: c }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
};

export const Loader = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return <View style={s.loader}><ActivityIndicator size="large" color={colors.primary} /></View>;
};

export const EmptyState = ({ text }: { text: string }) => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return <View style={s.loader}><Text style={{ color: colors.textMuted }}>{text}</Text></View>;
};

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.isDark ? '#000' : '#0B1F1A',
      shadowOpacity: colors.isDark ? 0.4 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    btnShadow: {
      borderRadius: 14,
      shadowColor: colors.primary,
      shadowOpacity: 0.5,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    btn: {
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
    btnText: { fontWeight: '800', fontSize: 16, letterSpacing: 0.3 } as TextStyle,
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
    badgeText: { fontSize: 12, fontWeight: '800' },
    loader: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  });
