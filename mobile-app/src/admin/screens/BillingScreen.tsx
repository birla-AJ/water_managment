import React, { useCallback, useState } from 'react';
import { View, FlatList, Modal, StyleSheet, Text, RefreshControl, Alert, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { config } from '../../config';
import { adminBillingApi } from '../api';
import type { Invoice } from '../types';
import { PageHeader, RowCard, StatusChip, Fab, Loader, EmptyState, FormInput } from '../components/ui';

const API_BASE = config.apiUrl.replace('/api/v1', '');

export default function BillingScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    periodStart: dayjs().startOf('month').format('YYYY-MM-DD'),
    periodEnd: dayjs().endOf('month').format('YYYY-MM-DD'),
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    try { const r = await adminBillingApi.list({ limit: 100 }); setItems(r.data ?? []); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const generate = async () => {
    if (!form.customerId.trim()) { Alert.alert(t('admin.billing.required'), t('admin.billing.customerIdRequired')); return; }
    setSaving(true);
    try { await adminBillingApi.generate(form); setOpen(false); load(); Alert.alert(t('admin.common.done'), t('admin.billing.invoiceGenerated')); }
    catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setSaving(false); }
  };

  const autoBill = () => {
    Alert.alert(t('admin.billing.autoBillTitle'), t('admin.billing.autoBillConfirm'), [
      { text: t('admin.common.cancel'), style: 'cancel' },
      { text: t('admin.billing.generate'), onPress: async () => {
        try { await adminBillingApi.autoGenerate('MONTHLY'); load(); Alert.alert(t('admin.common.done'), t('admin.billing.bulkGenerated')); }
        catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
      } },
    ]);
  };

  const openPdf = async (inv: Invoice) => {
    try { const { pdfUrl } = await adminBillingApi.pdf(inv.id); Linking.openURL(`${API_BASE}${pdfUrl}`); }
    catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
  };

  const notify = async (inv: Invoice) => {
    try { await adminBillingApi.notify(inv.id); Alert.alert(t('admin.billing.sentTitle'), t('admin.billing.notificationSent')); }
    catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={
          <View>
            <PageHeader subtitle={t('admin.billing.subtitle')} />
            <View style={{ marginBottom: 12 }}>
              <PrimaryButton title={t('admin.billing.autoBill')} variant="outline" onPress={autoBill} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <RowCard
            leftIcon="receipt"
            leftColor="#0EA5B5"
            title={item.customer?.name ?? item.invoiceNumber}
            subtitle={`${item.invoiceNumber} · ${dayjs(item.periodStart).format('DD MMM')}–${dayjs(item.periodEnd).format('DD MMM')}`}
            meta={t('admin.billing.invoiceMeta', { total: item.totalAmount, due: item.dueAmount })}
            right={
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <StatusChip status={item.status} />
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <TouchableOpacity onPress={() => openPdf(item)} hitSlop={6}><Icon name="file-pdf-box" size={20} color={colors.primary} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => notify(item)} hitSlop={6}><Icon name="bell-ring" size={20} color={colors.accent} /></TouchableOpacity>
                </View>
              </View>
            }
          />
        )}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="receipt-text-outline" text={t('admin.billing.noInvoices')} />}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      />
      <Fab onPress={() => setOpen(true)} />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t('admin.billing.generateInvoice')}</Text>
            <FormInput label={t('admin.billing.customerId')} value={form.customerId} onChangeText={set('customerId')} placeholder={t('admin.billing.customerIdPlaceholder')} autoCapitalize="none" />
            <FormInput label={t('admin.billing.periodStart')} value={form.periodStart} onChangeText={set('periodStart')} />
            <FormInput label={t('admin.billing.periodEnd')} value={form.periodEnd} onChangeText={set('periodEnd')} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <View style={{ flex: 1 }}><PrimaryButton title={t('admin.common.cancel')} variant="outline" onPress={() => setOpen(false)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title={t('admin.billing.generate')} onPress={generate} loading={saving} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
  });
