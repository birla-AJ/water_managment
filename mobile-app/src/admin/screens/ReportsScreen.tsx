import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { adminReportApi } from '../api';
import { PageHeader, FilterChips, EmptyState } from '../components/ui';

const TYPES = ['daily', 'weekly', 'monthly', 'yearly', 'revenue', 'customer', 'inventory', 'order', 'payment'];

interface ReportData { title?: string; columns?: string[]; rows?: Record<string, unknown>[] }

export default function ReportsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [type, setType] = useState('monthly');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await adminReportApi.get(type, {})); }
    catch { setData(null); } finally { setLoading(false); }
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <PageHeader title="Reports" subtitle="Generate & view business reports" />
      <FilterChips options={TYPES.map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))} value={type} onChange={setType} />
      <View style={{ height: 12 }} />

      <Text style={styles.reportTitle}>{data?.title ?? 'Report'}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : !rows.length ? (
        <EmptyState icon="chart-box-outline" text="No data for this report" />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={[styles.tr, styles.thead]}>
              {columns.map((c) => <Text key={c} style={[styles.cell, styles.th]} numberOfLines={1}>{c}</Text>)}
            </View>
            {rows.map((r, i) => (
              <View key={i} style={[styles.tr, i % 2 === 1 && { backgroundColor: colors.card }]}>
                {columns.map((c) => <Text key={c} style={styles.cell} numberOfLines={1}>{String(r[c] ?? '—')}</Text>)}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    reportTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
    tr: { flexDirection: 'row' },
    thead: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
    cell: { width: 130, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
    th: { fontWeight: '800', color: colors.textMuted },
  });
