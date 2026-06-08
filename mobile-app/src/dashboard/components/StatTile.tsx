import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AnimatedNumber } from '../../components/anim';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';

/**
 * KPI tile — the RN twin of admin-dashboard's StatCard. Shows an icon, a
 * count-up value and an optional subtitle, tinted by `color`. Pass `text` for
 * pre-formatted values (e.g. currency) instead of the animated number.
 */
export function StatTile({
  title, value, text, subtitle, icon, color,
}: {
  title: string;
  value?: number;
  text?: string;
  subtitle?: string;
  icon: string;
  color: string;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.tile, { borderTopColor: color, borderTopWidth: 3 }]}>
      <View style={s.topRow}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <View style={[s.iconWrap, { backgroundColor: color + '22' }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
      </View>
      {text !== undefined ? (
        <Text style={s.value} numberOfLines={1}>{text}</Text>
      ) : (
        <AnimatedNumber value={value ?? 0} style={s.value} />
      )}
      {!!subtitle && <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>}
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    tile: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
      justifyContent: 'space-between',
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    title: { fontSize: 12, color: colors.textMuted, fontWeight: '700', flex: 1, marginRight: 8 },
    iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    value: { fontSize: 22, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 4 },
  });
