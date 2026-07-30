import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ViewStyle,
  KeyboardTypeOptions, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PressableScale } from '../../components/anim';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';

/** Page title + optional subtitle and a trailing action (e.g. an add button). */
export function PageHeader({
  title, subtitle, action,
}: { title?: string; subtitle?: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.headerRow}>
      <View style={{ flex: 1 }}>
        {!!title && <Text style={s.title}>{title}</Text>}
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

export function SearchBar({
  value, onChangeText, placeholder = 'Search…',
}: { value: string; onChangeText: (t: string) => void; placeholder?: string }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.search}>
      <Icon name="magnify" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={s.searchInput}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Icon name="close-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Horizontal row of selectable filter chips. */
export function FilterChips<T extends string>({
  options, value, onChange,
}: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[s.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Text style={[s.chipText, active && { color: '#FFFFFF' }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'accent' | 'muted'> = {
  ACTIVE: 'success', DELIVERED: 'success', PAID: 'success', SUCCESS: 'success',
  PENDING: 'warning', PARTIALLY_PAID: 'warning', PROCESSING: 'accent', ACCEPTED: 'accent',
  INACTIVE: 'muted', CANCELLED: 'error', FAILED: 'error', OVERDUE: 'error', REFUNDED: 'accent',
};

export function StatusChip({ status }: { status: string }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const tone = STATUS_COLORS[status] ?? 'muted';
  const c = tone === 'muted' ? colors.textMuted : (colors as any)[tone];
  return (
    <View style={[s.chipStatus, { backgroundColor: c + '22', borderColor: c + '55' }]}>
      <Text style={[s.chipStatusText, { color: c }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

/** Tappable list row card with a title, subtitle and optional trailing node. */
export function RowCard({
  title, subtitle, meta, right, onPress, leftIcon, leftColor,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  leftIcon?: string;
  leftColor?: string;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const body = (
    <View style={s.row}>
      {leftIcon && (
        <View style={[s.rowIcon, { backgroundColor: (leftColor ?? colors.primary) + '22' }]}>
          <Icon name={leftIcon} size={20} color={leftColor ?? colors.primary} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={s.rowSubtitle} numberOfLines={1}>{subtitle}</Text>}
        {!!meta && <Text style={s.rowMeta} numberOfLines={1}>{meta}</Text>}
      </View>
      {right}
    </View>
  );
  return onPress ? <PressableScale onPress={onPress} style={s.rowWrap}>{body}</PressableScale> : <View style={s.rowWrap}>{body}</View>;
}

/** Standalone form field label (matches FormInput's label styling). */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={[s.fieldLabel, { marginBottom: 6 }]}>{children}</Text>;
}

/** label : value line used on detail screens. */
export function Field({ label, value }: { label: string; value?: string | number | null }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value === null || value === undefined || value === '' ? '—' : String(value)}</Text>
    </View>
  );
}

/**
 * Labeled text input for forms. Pass `error` to turn the border red and show a
 * message underneath, and `prefix` (e.g. "+91") for a fixed leading adornment.
 */
export function FormInput({
  label, value, onChangeText, placeholder, keyboardType, multiline, autoCapitalize, error, prefix,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  prefix?: string;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const borderColor = error ? colors.error : colors.cardBorder;
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.inputWrap, { borderColor }, multiline && { height: 90, alignItems: 'flex-start' }]}>
        {!!prefix && <Text style={s.prefix}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          style={[s.inputField, multiline && { height: 84, textAlignVertical: 'top' }]}
        />
      </View>
      {!!error && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}

/** A segmented control for picking one option (form selects). */
export function Segmented<T extends string>({
  label, options, value, onChange,
}: { label?: string; options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={{ marginBottom: 14 }}>
      {!!label && <Text style={s.fieldLabel}>{label}</Text>}
           <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.segment}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[s.segmentItem, active && { backgroundColor: colors.primary }]}
            >
              <Text style={[s.segmentText, active && { color: '#FFFFFF' }]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Floating action button (bottom-right). */
export function Fab({
  icon = 'plus', onPress, bottom = 168, side = 'right',
}: {
  icon?: string;
  onPress: () => void;
  bottom?: number;
  side?: 'left' | 'right';
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity activeOpacity={0.85} style={[s.fab, { bottom }, side === 'left' ? { left: 18 } : { right: 18 }]} onPress={onPress}>
      <Icon name={icon} size={26} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

export function Loader() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function EmptyState({ icon = 'inbox', text }: { icon?: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <Icon name={icon} size={46} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, marginTop: 12, fontWeight: '600', textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

export const screenContainer = (style?: ViewStyle): ViewStyle => ({ flex: 1, ...style });

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    title: { fontSize: 24, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 },

    search: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder,
      paddingHorizontal: 12, height: 46, marginBottom: 12,
    },
    searchInput: { flex: 1, color: colors.text, fontSize: 15, padding: 0 },

    chipsRow: { gap: 8, paddingVertical: 2, paddingRight: 8 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
    },
    chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },

    chipStatus: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
    chipStatusText: { fontSize: 11, fontWeight: '800' },

    rowWrap: {
      backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder,
      padding: 14, marginBottom: 10,
      shadowColor: colors.isDark ? '#000' : colors.primary,
      shadowOpacity: colors.isDark ? 0.35 : 0.1,
      shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    rowSubtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

    field: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
    },
    fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
    fieldValue: { fontSize: 14, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

    inputWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder,
      paddingHorizontal: 14, marginTop: 6,
    },
    prefix: { color: colors.textMuted, fontSize: 15, fontWeight: '700', marginRight: 6 },
    inputField: { flex: 1, paddingVertical: 12, color: colors.text, fontSize: 15 },
    errorText: { color: colors.error, fontSize: 12, fontWeight: '600', marginTop: 4 },

    segment: {
      flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1,
      borderColor: colors.cardBorder, padding: 4, marginTop: 6, gap: 4,
    },
    segmentItem: { paddingHorizontal:10,paddingVertical:8, borderRadius: 17, alignItems: 'center' ,marginHorizontal:3},
    segmentText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },

    fab: {
      position: 'absolute', width: 58, height: 58, borderRadius: 29,
      backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
    },
  });
