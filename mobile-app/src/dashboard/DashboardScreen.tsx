import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { FadeSlideIn } from '../components/anim';
import { Loader } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';
import { dashboardApi } from './api';
import type { DashboardCharts, DashboardOverview } from './types';
import { StatTile } from './components/StatTile';
import { BarChart, ChartCard, DistributionBar } from './components/charts';

// Same accent palette the web dashboard uses for its inventory pie.
const PIE_COLORS = ['#0E8388', '#16A8AE', '#2BB3B8', '#3FC1C9', '#0891B2', '#54C6CB'];

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  return (
    <View style={s.sectionRow}>
      <View style={s.sectionBar} />
      <Text style={s.sectionText}>{children}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([dashboardApi.overview(), dashboardApi.charts()]);
      setOverview(o);
      setCharts(c);
      setError(null);
    } catch (e: any) {
      // The /dashboard endpoints are admin-only; a non-admin token yields 401/403.
      setError(
        e?.response?.status === 401 || e?.response?.status === 403
          ? t('admin.dashboard.adminOnly')
          : t('admin.dashboard.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      setFocusKey((k) => k + 1);
      load();
    }, [load]),
  );

  if (loading) return <Loader />;

  if (error || !overview) {
    return (
      <View style={styles.errorWrap}>
        <Icon name="chart-box-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>{error ?? t('admin.dashboard.noData')}</Text>
      </View>
    );
  }

  const o = overview;

  // Mirrors the web dashboard's "Key metrics" row.
  const metrics = [
    { title: t('admin.dashboard.totalCustomers'), value: o.customers.total, icon: 'account-group', subtitle: t('admin.dashboard.customersSubtitle', { active: o.customers.active, inactive: o.customers.inactive }), color: '#0E8388' },
    { title: t('admin.dashboard.totalOrders'), value: o.orders.total, icon: 'cart', subtitle: t('admin.dashboard.ordersSubtitle', { n: o.orders.today }), color: '#0EA5B5' },
    { title: t('admin.dashboard.delivered'), value: o.orders.delivered, icon: 'truck-check', subtitle: t('admin.dashboard.deliveredSubtitle', { n: o.orders.pending }), color: '#34D399' },
    { title: t('admin.dashboard.monthlyRevenue'), text: inr(o.revenue.monthly), icon: 'currency-inr', subtitle: t('admin.dashboard.revenueSubtitle', { amount: inr(o.revenue.total) }), color: '#16A8AE' },
  ];

  // Mirrors the web dashboard's "Payments & inventory" row.
  const payInv = [
    { title: t('admin.dashboard.pendingPayments'), text: inr(o.payments.pending), icon: 'cash-clock', color: '#E0A92E' },
    { title: t('admin.dashboard.paid'), text: inr(o.payments.paid), icon: 'cash-check', color: '#34D399' },
    { title: t('admin.dashboard.filledCampers'), value: o.inventory.filled, icon: 'cup-water', subtitle: t('admin.dashboard.filledSubtitle', { n: o.inventory.empty }), color: '#1AA7B0' },
    { title: t('admin.dashboard.totalCampers'), value: o.inventory.total, icon: 'water', subtitle: t('admin.dashboard.totalCampersSubtitle', { n: o.orders.cancelled }), color: '#2BB3B8' },
    { title: t('admin.dashboard.damaged'), value: o.inventory.damaged, icon: 'alert-circle', color: '#E0A92E' },
    { title: t('admin.dashboard.lost'), value: o.inventory.lost, icon: 'help-circle', color: '#F87171' },
    { title: t('admin.dashboard.returned'), value: o.inventory.returned, icon: 'backup-restore', color: '#3FC1C9' },
    { title: t('admin.dashboard.cancelled'), value: o.orders.cancelled, icon: 'close-circle', color: '#F87171' },
  ];

  const inventoryDist = (charts?.inventory ?? []).map((it, i) => ({
    name: it.name,
    value: it.value,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          tintColor={colors.primary}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <FadeSlideIn key={`head-${focusKey}`}>
        <Text style={styles.subtitle}>{t('admin.dashboard.subtitle')}</Text>
      </FadeSlideIn>

      <SectionLabel>{t('admin.dashboard.sectionKeyMetrics')}</SectionLabel>
      <View style={styles.grid}>
        {metrics.map((m, i) => (
          <FadeSlideIn key={`${m.title}-${focusKey}`} delay={i * 70} style={styles.gridItem}>
            <StatTile {...m} />
          </FadeSlideIn>
        ))}
      </View>

      <SectionLabel>{t('admin.dashboard.sectionPaymentsInventory')}</SectionLabel>
      <View style={styles.grid}>
        {payInv.map((m, i) => (
          <FadeSlideIn key={`${m.title}-${focusKey}`} delay={i * 50} style={styles.gridItem}>
            <StatTile {...m} />
          </FadeSlideIn>
        ))}
      </View>

      <SectionLabel>{t('admin.dashboard.sectionAnalytics')}</SectionLabel>

      <FadeSlideIn key={`rev-${focusKey}`}>
        <ChartCard title={t('admin.dashboard.chartRevenue')} subtitle={t('admin.dashboard.last6Months')} accent="#0E8388">
          <BarChart
            data={(charts?.revenue ?? []).map((r) => ({ label: r.month.split(' ')[0], value: r.revenue, color: '#0E8388' }))}
            formatValue={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))}
          />
        </ChartCard>
      </FadeSlideIn>

      <FadeSlideIn key={`inv-${focusKey}`} delay={60}>
        <ChartCard title={t('admin.dashboard.chartInventory')} subtitle={t('admin.dashboard.currentCamperStatus')} accent="#16A8AE">
          <DistributionBar items={inventoryDist} />
        </ChartCard>
      </FadeSlideIn>

      <FadeSlideIn key={`ord-${focusKey}`} delay={120}>
        <ChartCard title={t('admin.dashboard.chartOrders')} subtitle={t('admin.dashboard.last14Days')} accent="#34D399">
          <BarChart
            barWidth={22}
            showValues={false}
            data={(charts?.orders ?? []).map((d) => ({
              label: d.date.split(' ')[0],
              segments: [
                { value: d.delivered, color: '#34D399' },
                { value: d.pending, color: '#E0A92E' },
                { value: d.cancelled, color: '#F87171' },
              ],
            }))}
          />
          <View style={styles.legendInline}>
            {[
              { name: t('admin.dashboard.delivered'), color: '#34D399' },
              { name: t('admin.dashboard.pending'), color: '#E0A92E' },
              { name: t('admin.dashboard.cancelled'), color: '#F87171' },
            ].map((l) => (
              <View key={l.name} style={styles.legendChip}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendLabel}>{l.name}</Text>
              </View>
            ))}
          </View>
        </ChartCard>
      </FadeSlideIn>

      <FadeSlideIn key={`growth-${focusKey}`} delay={180}>
        <ChartCard title={t('admin.dashboard.chartCustomerGrowth')} subtitle={t('admin.dashboard.newCustomersByMonth')} accent="#0891B2">
          <BarChart
            data={(charts?.customerGrowth ?? []).map((g) => ({ label: g.month.split(' ')[0], value: g.count, color: '#0891B2' }))}
          />
        </ChartCard>
      </FadeSlideIn>
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    subtitle: { fontSize: 15, color: colors.textMuted, fontWeight: '600', marginTop: 2 },

    sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 12 },
    sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: colors.primary, marginRight: 8 },
    sectionText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: colors.textMuted },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { width: '48.5%', marginBottom: 12 },

    legendInline: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
    legendChip: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

    errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: colors.bg },
    errorText: { color: colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 14, lineHeight: 20 },
  });
