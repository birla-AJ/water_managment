import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, Alert } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { adminInventoryApi } from '../api';
import type { Inventory } from '../types';
import { PageHeader, Segmented, FormInput, Loader } from '../components/ui';
import { StatTile } from '../../dashboard/components/StatTile';

const ACTIONS = ['STOCK_IN', 'FILLED', 'EMPTIED', 'ALLOCATED', 'RETURNED', 'DAMAGED', 'LOST', 'ADJUSTMENT'];

interface LogRow { id: string; action: string; quantity: number; remarks?: string; createdAt: string; admin?: { name: string } }

export default function InventoryScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [inv, setInv] = useState<Inventory | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [action, setAction] = useState('STOCK_IN');
  const [quantity, setQuantity] = useState('10');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [i, l] = await Promise.all([
        adminInventoryApi.get(),
        adminInventoryApi.logs({ limit: 50 }).catch(() => ({ data: [] })),
      ]);
      setInv(i);
      setLogs((l as { data: LogRow[] }).data ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const apply = async () => {
    setSaving(true);
    try {
      await adminInventoryApi.adjust(action, Number(quantity) || 0, remarks || undefined);
      setRemarks('');
      await load();
      Alert.alert(t('admin.inventory.updatedTitle'), t('admin.inventory.movementRecorded'));
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setSaving(false); }
  };

  if (loading || !inv) return <Loader />;

  const tiles = [
    { key: 'total', title: t('admin.inventory.tiles.total'), value: inv.totalCampers, icon: 'water', color: '#0E8388' },
    { key: 'filled', title: t('admin.inventory.tiles.filled'), value: inv.filledCampers, icon: 'cup-water', color: '#16A8AE' },
    { key: 'empty', title: t('admin.inventory.tiles.empty'), value: inv.emptyCampers, icon: 'cup-outline', color: '#3FC1C9' },
    { key: 'allocated', title: t('admin.inventory.tiles.allocated'), value: inv.allocatedCampers, icon: 'account-arrow-right', color: '#0891B2' },
    { key: 'returned', title: t('admin.inventory.tiles.returned'), value: inv.returnedCampers, icon: 'backup-restore', color: '#34D399' },
    { key: 'damaged', title: t('admin.inventory.tiles.damaged'), value: inv.damagedCampers, icon: 'alert-circle', color: '#E5544B' },
    { key: 'lost', title: t('admin.inventory.tiles.lost'), value: inv.lostCampers, icon: 'help-circle', color: '#F87171' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <PageHeader subtitle={t('admin.inventory.subtitle')} />

      <View style={styles.grid}>
        {tiles.map((tile) => (
          <View key={tile.key} style={styles.gridItem}><StatTile title={tile.title} value={tile.value} icon={tile.icon} color={tile.color} /></View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('admin.inventory.recordMovement')}</Text>
        <Segmented
          label={t('admin.inventory.action')}
          options={ACTIONS.map((a) => ({ label: t(`admin.inventory.actions.${a}`), value: a }))}
          value={action}
          onChange={setAction}
        />
        <FormInput label={t('admin.inventory.quantity')} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
        <FormInput label={t('admin.inventory.remarks')} value={remarks} onChangeText={setRemarks} placeholder={t('admin.inventory.optionalNote')} />
        <PrimaryButton title={t('admin.inventory.apply')} onPress={apply} loading={saving} />
      </View>

      <Text style={styles.section}>{t('admin.inventory.logs')}</Text>
      {logs.length === 0 ? (
        <Text style={styles.empty}>{t('admin.inventory.noMovements')}</Text>
      ) : logs.map((l) => (
        <View key={l.id} style={styles.logRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.logAction}>{t(`admin.inventory.actions.${l.action}`, { defaultValue: l.action.replace('_', ' ') })} · {l.quantity}</Text>
            <Text style={styles.logMeta}>{dayjs(l.createdAt).format('DD MMM YYYY HH:mm')} · {l.admin?.name ?? t('admin.inventory.system')}</Text>
            {!!l.remarks && <Text style={styles.logMeta}>{l.remarks}</Text>}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 6 },
    gridItem: { width: '48.5%', marginBottom: 12 },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginTop: 6, marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
    section: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 12 },
    empty: { color: colors.textMuted, fontWeight: '600' },
    logRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, marginBottom: 8 },
    logAction: { fontSize: 14, fontWeight: '800', color: colors.text },
    logMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  });
