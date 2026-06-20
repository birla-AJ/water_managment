import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import { Card, PrimaryButton } from '../components/ui';
import { meApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

const FMT = 'YYYY-MM-DD';
// dayjs .day(): 0=Sun .. 6=Sat — map to the backend weekday enum.
const WEEKDAY_ENUM = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const WEEKDAY_HEADER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type ScheduleItem = { weekday: string; enabled: boolean; quantity: number };

export default function SkipDeliveriesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<RouteProp<RootStackParamList, 'SkipDeliveries'>>();

  const today = useMemo(() => dayjs().startOf('day'), []);
  const [view, setView] = useState<'week' | 'month'>(route.params?.view === 'month' ? 'month' : 'week');
  const [weekStart, setWeekStart] = useState(() => dayjs().startOf('week')); // Sunday
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduleMap, setScheduleMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [skips, schedules] = await Promise.all([
        meApi.skipDates().catch(() => [] as string[]),
        meApi.schedules().catch(() => [] as ScheduleItem[]),
      ]);
      setSelected(new Set(skips));
      const map: Record<string, boolean> = {};
      (schedules as ScheduleItem[]).forEach((s) => { map[s.weekday] = s.enabled; });
      setScheduleMap(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isDeliveryDay = (d: dayjs.Dayjs) => scheduleMap[WEEKDAY_ENUM[d.day()]] === true;
  const isSkipped = (d: dayjs.Dayjs) => selected.has(d.format(FMT));

  // Skips persist by exact date, so a day toggled in Week view shows in Month view and vice-versa.
  const toggle = (d: dayjs.Dayjs) => {
    if (d.isBefore(today) || !isDeliveryDay(d)) return;
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
      const saved = await meApi.setSkipDates(Array.from(selected));
      setSelected(new Set(saved));
      Alert.alert('Saved', "Your delivery days are updated. We won't deliver on the days you skipped.");
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const skipCount = useMemo(
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
            <Text style={[styles.segmentText, view === v && styles.segmentTextActive]}>{v === 'week' ? 'This Week' : 'This Month'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.success }]} /><Text style={styles.legendText}>Delivery</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.error }]} /><Text style={styles.legendText}>Skipped</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.textMuted, opacity: 0.5 }]} /><Text style={styles.legendText}>No delivery</Text></View>
      </View>

      {view === 'week' ? (
        <WeekView
          colors={colors} styles={styles} weekStart={weekStart} today={today}
          isDeliveryDay={isDeliveryDay} isSkipped={isSkipped} toggle={toggle}
          onPrev={() => setWeekStart((w) => w.subtract(1, 'week'))}
          onNext={() => setWeekStart((w) => w.add(1, 'week'))}
          canPrev={weekStart.isAfter(dayjs().startOf('week'), 'day')}
        />
      ) : (
        <MonthView
          colors={colors} styles={styles} month={month} today={today}
          isDeliveryDay={isDeliveryDay} isSkipped={isSkipped} toggle={toggle}
          onPrev={() => setMonth((m) => m.subtract(1, 'month'))}
          onNext={() => setMonth((m) => m.add(1, 'month'))}
          canPrev={month.isAfter(dayjs().startOf('month'), 'day')}
        />
      )}

      <Text style={styles.footNote}>
        {skipCount ? `${skipCount} upcoming day${skipCount > 1 ? 's' : ''} skipped.` : 'No upcoming days skipped.'} Tap a delivery day to toggle.
      </Text>
      <PrimaryButton title="Save changes" onPress={save} loading={saving} />
    </ScrollView>
  );
}

// ---------------- Week ----------------
function WeekView({ colors, styles, weekStart, today, isDeliveryDay, isSkipped, toggle, onPrev, onNext, canPrev }: any) {
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  return (
    <Card style={{ paddingVertical: 6 }}>
      <Nav title={`${weekStart.format('MMM D')} – ${weekStart.add(6, 'day').format('MMM D')}`} styles={styles} colors={colors} onPrev={onPrev} onNext={onNext} canPrev={canPrev} />
      {days.map((d: dayjs.Dayjs) => {
        const past = d.isBefore(today);
        const delivery = isDeliveryDay(d);
        const skipped = isSkipped(d);
        const interactive = !past && delivery;
        const accent = skipped ? colors.error : colors.success;
        return (
          <TouchableOpacity key={d.format(FMT)} disabled={!interactive} activeOpacity={0.7} onPress={() => toggle(d)} style={[styles.dayRow, past && { opacity: 0.45 }]}>
            <View style={[styles.dateBlock, { backgroundColor: d.isSame(today, 'day') ? colors.primary + '22' : 'transparent' }]}>
              <Text style={styles.dow}>{d.format('ddd')}</Text>
              <Text style={styles.dateNum}>{d.format('D')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{!delivery ? 'No delivery' : skipped ? 'Skipped' : 'Water delivery'}</Text>
              <Text style={styles.rowSub}>
                {past ? 'Past' : !delivery ? 'Not a scheduled day' : skipped ? "You won't receive water" : 'Tap to skip this day'}
              </Text>
            </View>
            {delivery && !past ? (
              <View style={[styles.statusCircle, { backgroundColor: accent }]}>
                <Icon name={skipped ? 'close' : 'check'} size={18} color="#FFFFFF" />
              </View>
            ) : !delivery && !past ? (
              <Icon name="minus-circle-outline" size={22} color={colors.textMuted} />
            ) : null}
          </TouchableOpacity>
        );
      })}
    </Card>
  );
}

// ---------------- Month ----------------
function MonthView({ colors, styles, month, today, isDeliveryDay, isSkipped, toggle, onPrev, onNext, canPrev }: any) {
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
          const delivery = isDeliveryDay(d);
          const skipped = isSkipped(d);
          const isToday = d.isSame(today, 'day');
          const interactive = !past && delivery;
          return (
            <TouchableOpacity key={d.format(FMT)} disabled={!interactive} activeOpacity={0.7} onPress={() => toggle(d)} style={styles.cell}>
              <View style={[
                styles.day,
                isToday && !skipped && styles.dayToday,
                skipped && { backgroundColor: colors.error },
              ]}>
                <Text style={[
                  styles.dayText,
                  (past || !delivery) && styles.dayTextMuted,
                  skipped && styles.dayTextSelected,
                ]}>
                  {d.date()}
                </Text>
              </View>
              {/* delivery indicator dot */}
              {delivery && !skipped && !past && <View style={[styles.deliveryDot, { backgroundColor: colors.success }]} />}
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
    dayToday: { borderWidth: 1.5, borderColor: colors.primary },
    dayText: { fontSize: 15, fontWeight: '700', color: colors.text },
    dayTextMuted: { color: colors.textMuted, opacity: 0.45, fontWeight: '500' },
    dayTextSelected: { color: '#FFFFFF', fontWeight: '800' },
    deliveryDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },

    footNote: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginVertical: 14 },
  });
