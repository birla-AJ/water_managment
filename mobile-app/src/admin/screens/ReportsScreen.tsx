import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { useAppSelector } from '../../store/hooks';
import { adminReportApi, adminExportApi } from '../api';
import { PageHeader, FilterChips, EmptyState } from '../components/ui';

const EXPORTS: { label: string; format: string; icon: string; color: string }[] = [
  { label: 'Excel', format: 'excel', icon: 'file-excel-outline', color: '#179A33' },
  { label: 'CSV', format: 'csv', icon: 'file-delimited-outline', color: '#0E8C84' },
  { label: 'PDF', format: 'pdf', icon: 'file-pdf-box', color: '#D32F2F' },
];

const TYPES = ['daily', 'weekly', 'monthly', 'yearly', 'revenue', 'customer', 'inventory', 'order', 'payment'];

interface ReportData { title?: string; columns?: string[]; rows?: Record<string, unknown>[] }

export default function ReportsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const token = useAppSelector((s) => s.auth.accessToken);
  const [type, setType] = useState('monthly');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const exportReport = async (format: string) => {
    if (!token) { Alert.alert(t('admin.common.error'), t('admin.reports.signInToExport')); return; }
    const url = adminExportApi.reportUrl(type, format, token);
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) Linking.openURL(url);
      else Alert.alert(t('admin.common.error'), t('admin.reports.couldNotOpen'));
    } catch { Alert.alert(t('admin.common.error'), t('admin.reports.couldNotOpen')); }
  };

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
      <PageHeader subtitle={t('admin.reports.subtitle')} />
      <FilterChips options={TYPES.map((ty) => ({ label: t(`admin.reports.types.${ty}`), value: ty }))} value={type} onChange={setType} />
      <View style={{ height: 12 }} />

      <View style={styles.exportRow}>
        {EXPORTS.map((e) => (
          <TouchableOpacity key={e.format} style={[styles.exportBtn, { borderColor: e.color + '55' }]} activeOpacity={0.7} onPress={() => exportReport(e.format)}>
            <Icon name={e.icon} size={18} color={e.color} />
            <Text style={[styles.exportText, { color: e.color }]}>{e.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.reportTitle}>{data?.title ?? t('admin.reports.reportFallback')}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : !rows.length ? (
        <EmptyState icon="chart-box-outline" text={t('admin.reports.noData')} />
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
    exportRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    exportBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, paddingVertical: 11,
    },
    exportText: { fontWeight: '800', fontSize: 13 },
    reportTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
    tr: { flexDirection: 'row' },
    thead: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
    cell: { width: 130, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
    th: { fontWeight: '800', color: colors.textMuted },
  });
