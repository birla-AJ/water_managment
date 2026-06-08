import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
const PIE_COLORS = ['#2DD4BF', '#22D3EE', '#34D399', '#D9E25A', '#F87171', '#38BDF8'];

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
          ? 'This dashboard is only available to admin accounts.'
          : 'Could not load the dashboard. Pull to refresh.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
        <Text style={styles.errorText}>{error ?? 'No data available.'}</Text>
      </View>
    );
  }

  const o = overview;

  // Mirrors the web dashboard's "Key metrics" row.
  const metrics = [
    { title: 'Total Customers', value: o.customers.total, icon: 'account-group', subtitle: `${o.customers.active} active · ${o.customers.inactive} inactive`, color: '#2DD4BF' },
    { title: 'Total Orders', value: o.orders.total, icon: 'cart', subtitle: `${o.orders.today} today`, color: '#22D3EE' },
    { title: 'Delivered', value: o.orders.delivered, icon: 'truck-check', subtitle: `${o.orders.pending} pending`, color: '#34D399' },
    { title: 'Monthly Revenue', text: inr(o.revenue.monthly), icon: 'currency-inr', subtitle: `Total ${inr(o.revenue.total)}`, color: '#D9E25A' },
  ];

  // Mirrors the web dashboard's "Payments & inventory" row.
  const payInv = [
    { title: 'Pending Payments', text: inr(o.payments.pending), icon: 'cash-clock', color: '#F87171' },
    { title: 'Paid', text: inr(o.payments.paid), icon: 'cash-check', color: '#34D399' },
    { title: 'Filled Campers', value: o.inventory.filled, icon: 'cup-water', subtitle: `${o.inventory.empty} empty`, color: '#2DD4BF' },
    { title: 'Total Campers', value: o.inventory.total, icon: 'water', subtitle: `${o.orders.cancelled} cancelled orders`, color: '#14B8A6' },
    { title: 'Damaged', value: o.inventory.damaged, icon: 'alert-circle', color: '#D9E25A' },
    { title: 'Lost', value: o.inventory.lost, icon: 'help-circle', color: '#F87171' },
    { title: 'Returned', value: o.inventory.returned, icon: 'backup-restore', color: '#22D3EE' },
    { title: 'Cancelled', value: o.orders.cancelled, icon: 'close-circle', color: '#8AA6B2' },
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
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Overview of your water distribution business</Text>
      </FadeSlideIn>

      <SectionLabel>KEY METRICS</SectionLabel>
      <View style={styles.grid}>
        {metrics.map((m, i) => (
          <FadeSlideIn key={`${m.title}-${focusKey}`} delay={i * 70} style={styles.gridItem}>
            <StatTile {...m} />
          </FadeSlideIn>
        ))}
      </View>

      <SectionLabel>PAYMENTS &amp; INVENTORY</SectionLabel>
      <View style={styles.grid}>
        {payInv.map((m, i) => (
          <FadeSlideIn key={`${m.title}-${focusKey}`} delay={i * 50} style={styles.gridItem}>
            <StatTile {...m} />
          </FadeSlideIn>
        ))}
      </View>

      <SectionLabel>ANALYTICS</SectionLabel>

      <FadeSlideIn key={`rev-${focusKey}`}>
        <ChartCard title="Revenue" subtitle="Last 6 months" accent="#2DD4BF">
          <BarChart
            data={(charts?.revenue ?? []).map((r) => ({ label: r.month.split(' ')[0], value: r.revenue, color: '#2DD4BF' }))}
            formatValue={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))}
          />
        </ChartCard>
      </FadeSlideIn>

      <FadeSlideIn key={`inv-${focusKey}`} delay={60}>
        <ChartCard title="Inventory" subtitle="Current camper status" accent="#22D3EE">
          <DistributionBar items={inventoryDist} />
        </ChartCard>
      </FadeSlideIn>

      <FadeSlideIn key={`ord-${focusKey}`} delay={120}>
        <ChartCard title="Orders" subtitle="Last 14 days" accent="#34D399">
          <BarChart
            barWidth={22}
            showValues={false}
            data={(charts?.orders ?? []).map((d) => ({
              label: d.date.split(' ')[0],
              segments: [
                { value: d.delivered, color: '#34D399' },
                { value: d.pending, color: '#D9E25A' },
                { value: d.cancelled, color: '#F87171' },
              ],
            }))}
          />
          <View style={styles.legendInline}>
            {[
              { name: 'Delivered', color: '#34D399' },
              { name: 'Pending', color: '#D9E25A' },
              { name: 'Cancelled', color: '#F87171' },
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
        <ChartCard title="Customer Growth" subtitle="New customers by month" accent="#38BDF8">
          <BarChart
            data={(charts?.customerGrowth ?? []).map((g) => ({ label: g.month.split(' ')[0], value: g.count, color: '#22D3EE' }))}
          />
        </ChartCard>
      </FadeSlideIn>
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 },

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
