import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Card, PrimaryButton } from '../components/ui';
import { meApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

const FMT = 'YYYY-MM-DD';
const WEEKDAY_HEADER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Water is opt-in: every upcoming day starts as "no delivery" (red) and the
 * customer taps the days they DO want water on (green). Saving syncs the whole
 * upcoming selection and notifies the assigned driver and the distributor.
 */
export default function DeliveryCalendarScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<RouteProp<RootStackParamList, 'DeliveryCalendar'>>();

  const today = useMemo(() => dayjs().startOf('day'), []);
  const [view, setView] = useState<'week' | 'month'>(route.params?.view === 'month' ? 'month' : 'week');
  const [weekStart, setWeekStart] = useState(() => dayjs().startOf('week')); // Sunday
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const dates = await meApi.deliveryDates().catch(() => [] as string[]);
      setSelected(new Set(dates));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isWanted = (d: dayjs.Dayjs) => selected.has(d.format(FMT));

  // Selections persist by exact date, so a day toggled in Week view shows in
  // Month view and vice-versa. Past days can't be changed.
  const toggle = (d: dayjs.Dayjs) => {
    if (d.isBefore(today)) return;
    const key = d.format(FMT);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await meApi.setDeliveryDates(Array.from(selected));
      setSelected(new Set(saved));
      Alert.alert(
        t('deliveryCalendar.savedTitle'),
        t('deliveryCalendar.savedMsg'),
      );
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const wantedCount = useMemo(
    () => Array.from(selected).filter((d) => !dayjs(d).isBefore(today)).length,
    [selected, today],
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
      {/* Segmented toggle */}
      <View style={styles.segment}>
        {(['week', 'month'] as const).map((v) => (
          <TouchableOpacity key={v} style={[styles.segmentBtn, view === v && styles.segmentBtnActive]} onPress={() => setView(v)} activeOpacity={0.8}>
            <Text style={[styles.segmentText, view === v && styles.segmentTextActive]}>{v === 'week' ? t('common.thisWeek') : t('common.thisMonth')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* How it works */}
      <View style={styles.infoBanner}>
        <Icon name="information-outline" size={18} color={colors.primary} />
        <Text style={styles.infoText}>
          {t('deliveryCalendar.infoBanner')}
        </Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.success }]} /><Text style={styles.legendText}>{t('deliveryCalendar.legendNeeded')}</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.error }]} /><Text style={styles.legendText}>{t('deliveryCalendar.legendNone')}</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.textMuted, opacity: 0.5 }]} /><Text style={styles.legendText}>{t('deliveryCalendar.legendPast')}</Text></View>
      </View>

      {view === 'week' ? (
        <WeekView
          colors={colors} styles={styles} weekStart={weekStart} today={today}
          isWanted={isWanted} toggle={toggle} t={t}
          onPrev={() => setWeekStart((w) => w.subtract(1, 'week'))}
          onNext={() => setWeekStart((w) => w.add(1, 'week'))}
          canPrev={weekStart.isAfter(dayjs().startOf('week'), 'day')}
        />
      ) : (
        <MonthView
          colors={colors} styles={styles} month={month} today={today}
          isWanted={isWanted} toggle={toggle}
          onPrev={() => setMonth((m) => m.subtract(1, 'month'))}
          onNext={() => setMonth((m) => m.add(1, 'month'))}
          canPrev={month.isAfter(dayjs().startOf('month'), 'day')}
        />
      )}

      <Text style={styles.footNote}>
        {wantedCount
          ? t('deliveryCalendar.footNoteMarked', { count: wantedCount })
          : t('deliveryCalendar.footNoteEmpty')}
      </Text>
      <PrimaryButton title={t('deliveryCalendar.saveChanges')} onPress={save} loading={saving} />
    </ScrollView>
  );
}

// ---------------- Week ----------------
function WeekView({ colors, styles, weekStart, today, isWanted, toggle, onPrev, onNext, canPrev, t }: any) {
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  return (
    <Card style={{ paddingVertical: 6 }}>
      <Nav title={`${weekStart.format('MMM D')} – ${weekStart.add(6, 'day').format('MMM D')}`} styles={styles} colors={colors} onPrev={onPrev} onNext={onNext} canPrev={canPrev} />
      {days.map((d: dayjs.Dayjs) => {
        const past = d.isBefore(today);
        const wanted = isWanted(d);
        const accent = wanted ? colors.success : colors.error;
        return (
          <TouchableOpacity key={d.format(FMT)} disabled={past} activeOpacity={0.7} onPress={() => toggle(d)} style={[styles.dayRow, past && { opacity: 0.45 }]}>
            <View style={[styles.dateBlock, { backgroundColor: d.isSame(today, 'day') ? colors.primary + '22' : 'transparent' }]}>
              <Text style={styles.dow}>{d.format('ddd')}</Text>
              <Text style={styles.dateNum}>{d.format('D')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{wanted ? t('deliveryCalendar.waterDelivery') : t('deliveryCalendar.noDelivery')}</Text>
              <Text style={styles.rowSub}>
                {past
                  ? t('deliveryCalendar.past')
                  : wanted
                    ? t('deliveryCalendar.willReceive')
                    : t('deliveryCalendar.tapIfNeeded')}
              </Text>
            </View>
            {!past ? (
              <View style={[styles.statusCircle, { backgroundColor: accent }]}>
                <Icon name={wanted ? 'check' : 'close'} size={18} color="#FFFFFF" />
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </Card>
  );
}

// ---------------- Month ----------------
function MonthView({ colors, styles, month, today, isWanted, toggle, onPrev, onNext, canPrev }: any) {
  const cells: (dayjs.Dayjs | null)[] = [];
  const offset = month.day();
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= month.daysInMonth(); d++) cells.push(month.date(d));

  return (
    <Card style={{ paddingHorizontal: 10 }}>
      <Nav title={month.format('MMMM YYYY')} styles={styles} colors={colors} onPrev={onPrev} onNext={onNext} canPrev={canPrev} />
      <View style={styles.weekHeader}>
        {WEEKDAY_HEADER.map((w, i) => <Text key={i} style={styles.weekHeaderText}>{w}</Text>)}
      </View>
      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={`b-${i}`} style={styles.cell} />;
          const past = d.isBefore(today);
          const wanted = isWanted(d);
          const isToday = d.isSame(today, 'day');
          return (
            <TouchableOpacity key={d.format(FMT)} disabled={past} activeOpacity={0.7} onPress={() => toggle(d)} style={styles.cell}>
              <View style={[
                styles.day,
                // Upcoming days default to "no delivery" (red); marked days go green.
                !past && (wanted
                  ? { backgroundColor: colors.success }
                  : { backgroundColor: colors.error + '1F', borderWidth: 1, borderColor: colors.error + '66' }),
                isToday && styles.dayToday,
              ]}>
                <Text style={[
                  styles.dayText,
                  past && styles.dayTextMuted,
                  !past && !wanted && { color: colors.error },
                  wanted && styles.dayTextSelected,
                ]}>
                  {d.date()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
}

function Nav({ title, styles, colors, onPrev, onNext, canPrev }: any) {
  return (
    <View style={styles.navRow}>
      <TouchableOpacity disabled={!canPrev} onPress={onPrev} style={[styles.navBtn, !canPrev && { opacity: 0.3 }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="chevron-left" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.navTitle}>{title}</Text>
      <TouchableOpacity onPress={onNext} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="chevron-right" size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

    segment: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: colors.cardBorder },
    segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    segmentBtnActive: { backgroundColor: colors.primary },
    segmentText: { fontWeight: '700', color: colors.textMuted },
    segmentTextActive: { color: '#FFFFFF' },

    infoBanner: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12,
      padding: 12, borderRadius: 12, backgroundColor: colors.primary + '14',
      borderWidth: 1, borderColor: colors.primary + '33',
    },
    infoText: { flex: 1, color: colors.text, fontSize: 12.5, fontWeight: '600', lineHeight: 18 },

    legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 9, height: 9, borderRadius: 5 },
    legendText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4 },
    navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    navTitle: { fontSize: 16, fontWeight: '800', color: colors.text },

    // week rows
    dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: colors.border },
    dateBlock: { width: 48, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    dow: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
    dateNum: { fontSize: 18, fontWeight: '800', color: colors.text },
    rowTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    statusCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

    // month grid
    weekHeader: { flexDirection: 'row', marginTop: 6, marginBottom: 4 },
    weekHeaderText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: colors.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, height: 50, alignItems: 'center', justifyContent: 'center' },
    day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    dayToday: { borderWidth: 2, borderColor: colors.primary },
    dayText: { fontSize: 15, fontWeight: '700', color: colors.text },
    dayTextMuted: { color: colors.textMuted, opacity: 0.45, fontWeight: '500' },
    dayTextSelected: { color: '#FFFFFF', fontWeight: '800' },

    footNote: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginVertical: 14 },
  });
