import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { GradientView } from '../components/ui';
import { FadeSlideIn, PressableScale, AnimatedNumber } from '../components/anim';
import { useAppSelector } from '../store/hooks';
import { billingApi, deliveryApi, meApi } from '../api/endpoints';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

// Cohesive aqua/teal accent family (monochrome look, matching the reference).
const ACTIONS = [
  { label: 'Order Camper', icon: 'water-plus', screen: 'Order', tab: true, color: '#0E8388' },
  { label: 'My Deliveries', icon: 'truck-delivery', screen: 'Deliveries', tab: true, color: '#0EA5B5' },
  { label: 'Order History', icon: 'history', screen: 'OrderHistory', color: '#1AA7B0' },
  { label: 'Billing', icon: 'receipt', screen: 'Bills', tab: true, color: '#2BB3B8' },
  { label: 'Payments', icon: 'credit-card', screen: 'PaymentHistory', color: '#0C7C82' },
  { label: 'Notifications', icon: 'bell', screen: 'Notifications', color: '#3FC1C9' },
  { label: 'Support', icon: 'headset', screen: 'Support', color: '#16A8AE' },
] as const;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const user = useAppSelector((s) => s.auth.user);
  const navigation = useNavigation<any>();

  const [due, setDue] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [campers, setCampers] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [focusKey, setFocusKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const [d, week, month, profile] = await Promise.all([
        billingApi.due().catch(() => ({})),
        deliveryApi.summary('week').catch(() => ({})),
        deliveryApi.summary('month').catch(() => ({})),
        meApi.profile().catch(() => ({})),
      ]);
      setDue(d?.dueAmount ?? 0);
      setWeekCount(week?.totalDelivered ?? 0);
      setMonthCount(month?.totalDelivered ?? 0);
      setCampers(profile?.allocatedCampers ?? 0);
      setIsPaused(!!profile?.isPaused);
    } catch { /* ignore */ }
  }, []);

  useFocusEffect(useCallback(() => { setFocusKey((k) => k + 1); load(); }, [load]));

  const go = (t: { screen: string; tab?: boolean }) => {
    if (t.tab) navigation.navigate('Main', { screen: t.screen });
    else navigation.navigate(t.screen);
  };

  const firstName = user?.name?.split(' ')[0] || 'there';
  const initial = (user?.name?.[0] || 'U').toUpperCase();
  const settled = due <= 0;

  const stats = [
    { label: 'This week', value: weekCount, icon: 'calendar-week', color: colors.primary, view: 'week' as const },
    { label: 'This month', value: monthCount, icon: 'calendar-month', color: '#1AA7B0', view: 'month' as const },
    { label: 'Campers', value: campers, icon: 'cup-water', color: '#2BB3B8' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          tintColor={colors.primary}
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
        />
      }
    >
      {/* Greeting */}
      <FadeSlideIn key={`greet-${focusKey}`}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingSub}>{greeting()},</Text>
            <Text style={styles.greetingName}>{firstName} 👋</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>
      </FadeSlideIn>

      {/* Pause banner */}
      {isPaused && (
        <FadeSlideIn key={`pause-${focusKey}`} delay={60}>
          <View style={styles.pauseBanner}>
            <Icon name="pause-circle" size={20} color={colors.warning} />
            <Text style={styles.pauseText}>Deliveries are paused. Resume them from your Profile.</Text>
          </View>
        </FadeSlideIn>
      )}

      {/* Balance hero */}
      <FadeSlideIn key={`due-${focusKey}`} delay={90}>
        <GradientView style={styles.heroCard}>
          <Icon name="water" size={120} color="#FFFFFF" style={styles.heroWatermark} />
          <Text style={styles.heroLabel}>Outstanding Balance</Text>
          <AnimatedNumber
            value={due}
            style={styles.heroAmount}
            format={(n) => `₹${Math.round(n).toLocaleString('en-IN')}`}
          />
          {settled ? (
            <View style={styles.settledRow}>
              <Icon name="check-circle" size={16} color="#FFFFFF" />
              <Text style={styles.settledText}>You're all caught up</Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.payBtn}
              onPress={() => navigation.navigate('Main', { screen: 'Bills' })}
            >
              <Text style={[styles.payBtnText, { color: colors.primary }]}>Pay Now</Text>
              <Icon name="arrow-right" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </GradientView>
      </FadeSlideIn>

      {/* Stats — This week / This month open the delivery manager */}
      <FadeSlideIn key={`stats-${focusKey}`} delay={150}>
        <View style={styles.statsRow}>
          {stats.map((s) => {
            const tappable = 'view' in s;
            const inner = (
              <>
                <View style={styles.statTop}>
                  <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
                    <Icon name={s.icon} size={20} color={s.color} />
                  </View>
                  {tappable && <Icon name="chevron-right" size={18} color={colors.textMuted} />}
                </View>
                <AnimatedNumber value={s.value} style={styles.statNum} />
                <Text style={styles.statLabel}>{s.label}</Text>
                {tappable && <Text style={styles.statHint}>Tap to manage</Text>}
              </>
            );
            return tappable ? (
              <PressableScale key={s.label} style={styles.statCard} onPress={() => navigation.navigate('SkipDeliveries', { view: (s as any).view })}>
                {inner}
              </PressableScale>
            ) : (
              <View key={s.label} style={styles.statCard}>{inner}</View>
            );
          })}
        </View>
      </FadeSlideIn>

      {/* Quick actions */}
      <FadeSlideIn key={`sec-${focusKey}`} delay={210}>
        <Text style={styles.section}>Quick Actions</Text>
      </FadeSlideIn>

      <View style={styles.grid}>
        {ACTIONS.map((t, i) => (
          <FadeSlideIn key={`${t.label}-${focusKey}`} delay={250 + i * 50} style={styles.tileWrap}>
            <PressableScale onPress={() => go(t)} style={styles.tile}>
              <View style={[styles.tileIcon, { backgroundColor: t.color + '22' }]}>
                <Icon name={t.icon} size={24} color={t.color} />
              </View>
              <Text style={styles.tileText}>{t.label}</Text>
            </PressableScale>
          </FadeSlideIn>
        ))}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    greetingSub: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
    greetingName: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 2 },
    avatar: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },

    pauseBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.warning + '1F', borderColor: colors.warning + '55', borderWidth: 1,
      borderRadius: 14, padding: 12, marginBottom: 14,
    },
    pauseText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },

    heroCard: {
      borderRadius: 24, padding: 22, marginBottom: 16, overflow: 'hidden',
      shadowColor: colors.primary, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 10,
    },
    heroWatermark: { position: 'absolute', right: -18, top: -10, opacity: 0.12 },
    heroLabel: { fontSize: 14, color: '#FFFFFF', opacity: 0.9, fontWeight: '600' },
    heroAmount: { fontSize: 40, fontWeight: '800', color: '#FFFFFF', marginVertical: 8 },
    payBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: '#FFFFFF', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 26, marginTop: 6,
    },
    payBtnText: { fontWeight: '800', fontSize: 15 },
    settledRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    settledText: { color: '#FFFFFF', fontWeight: '700', opacity: 0.95 },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
    statCard: {
      flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 14, alignItems: 'flex-start',
      borderWidth: 1, borderColor: colors.cardBorder,
    },
    statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch', marginBottom: 10 },
    statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    statNum: { fontSize: 22, fontWeight: '800', color: colors.text },
    statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2, fontWeight: '600' },
    statHint: { color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 6 },

    section: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 18, marginBottom: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    tileWrap: { width: '31%', marginBottom: 12 },
    tile: {
      backgroundColor: colors.card, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 6, alignItems: 'center',
      borderWidth: 1, borderColor: colors.cardBorder,
    },
    tileIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    tileText: { fontSize: 12, color: colors.text, marginTop: 10, textAlign: 'center', fontWeight: '700' },
  });
