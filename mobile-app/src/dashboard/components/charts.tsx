import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';

/** Card shell with an accent stripe — the RN twin of the web dashboard's ChartCard. */
export function ChartCard({
  title, subtitle, accent, children, style,
}: { title: string; subtitle?: string; accent?: string; children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.card, style]}>
      <View style={[s.accent, { backgroundColor: accent ?? colors.primary }]} />
      <Text style={s.cardTitle}>{title}</Text>
      {!!subtitle && <Text style={s.cardSubtitle}>{subtitle}</Text>}
      <View style={{ marginTop: 14 }}>{children}</View>
    </View>
  );
}

export type BarSegment = { value: number; color: string };
export type BarDatum = { label: string; value?: number; segments?: BarSegment[]; color?: string };

/**
 * Lightweight vertical bar chart built from plain Views (no native chart dep).
 * Pass `segments` for stacked bars (e.g. orders by status) or `value` for a
 * single series (e.g. revenue / customer growth). Scrolls horizontally when
 * there are many bars so 14-day series stay readable on a phone.
 */
export function BarChart({
  data, height = 160, barWidth = 26, formatValue, showValues = true,
}: {
  data: BarDatum[];
  height?: number;
  barWidth?: number;
  formatValue?: (n: number) => string;
  showValues?: boolean;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const totals = data.map((d) => (d.segments ? d.segments.reduce((a, b) => a + b.value, 0) : d.value ?? 0));
  const max = Math.max(1, ...totals);

  const Bars = (
    <View style={[s.barsRow, { height: height + 34 }]}>
      {data.map((d, i) => {
        const total = totals[i];
        const fillH = Math.max(total > 0 ? 4 : 0, (total / max) * height);
        return (
          <View key={`${d.label}-${i}`} style={[s.barCol, { width: barWidth }]}>
            {showValues && (
              <Text style={s.barValue} numberOfLines={1}>
                {total > 0 ? (formatValue ? formatValue(total) : String(total)) : ''}
              </Text>
            )}
            <View style={[s.barTrack, { height }]}>
              <View style={[s.barFill, { height: fillH }]}>
                {d.segments ? (
                  d.segments.map((seg, j) => {
                    const segH = total > 0 ? (seg.value / total) * fillH : 0;
                    const first = j === 0;
                    const last = j === d.segments!.length - 1;
                    return (
                      <View
                        key={j}
                        style={{
                          height: segH,
                          backgroundColor: seg.color,
                          borderTopLeftRadius: last ? 6 : 0,
                          borderTopRightRadius: last ? 6 : 0,
                          borderBottomLeftRadius: first ? 6 : 0,
                          borderBottomRightRadius: first ? 6 : 0,
                        }}
                      />
                    );
                  })
                ) : (
                  <View style={{ flex: 1, backgroundColor: d.color ?? colors.primary, borderRadius: 6 }} />
                )}
              </View>
            </View>
            <Text style={s.barLabel} numberOfLines={1}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );

  // Scroll horizontally once the bars would overflow the typical phone width.
  return data.length > 7 ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>{Bars}</ScrollView>
  ) : (
    Bars
  );
}

/** A legend chip — colored dot + label + value. */
export function LegendRow({ items }: { items: { name: string; value: number; color: string }[] }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.legend}>
      {items.map((it) => (
        <View key={it.name} style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: it.color }]} />
          <Text style={s.legendName}>{it.name}</Text>
          <Text style={s.legendValue}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Horizontal stacked distribution bar — the phone-friendly stand-in for the
 * web dashboard's inventory pie chart. Shows each slice's share of the whole.
 */
export function DistributionBar({ items }: { items: { name: string; value: number; color: string }[] }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const total = items.reduce((a, b) => a + b.value, 0);

  return (
    <View>
      <View style={s.distTrack}>
        {total > 0 ? (
          items.map((it) =>
            it.value > 0 ? (
              <View key={it.name} style={{ flex: it.value, backgroundColor: it.color }} />
            ) : null,
          )
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.border }} />
        )}
      </View>
      <LegendRow items={items} />
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      paddingTop: 18,
      marginBottom: 14,
      overflow: 'hidden',
    },
    accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, opacity: 0.85 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    cardSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '600' },

    barsRow: { flexDirection: 'row', alignItems: 'flex-end' },
    barCol: { alignItems: 'center', marginHorizontal: 5 },
    barTrack: { width: '100%', justifyContent: 'flex-end', borderRadius: 6 },
    barFill: { width: '100%', justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 6 },
    barValue: { fontSize: 9, color: colors.textMuted, fontWeight: '700', marginBottom: 4, height: 12 },
    barLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '600', marginTop: 6, height: 12 },

    legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
    legendItem: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 8 },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendName: { fontSize: 12, color: colors.textMuted, fontWeight: '600', flex: 1 },
    legendValue: { fontSize: 12, color: colors.text, fontWeight: '800', marginRight: 10 },

    distTrack: { flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: colors.border },
  });
