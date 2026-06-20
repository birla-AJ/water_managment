import React, { useCallback, useState } from 'react';
import { View, FlatList, Modal, StyleSheet, Text, RefreshControl, Alert, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
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
    if (!form.customerId.trim()) { Alert.alert('Required', 'Customer ID is required.'); return; }
    setSaving(true);
    try { await adminBillingApi.generate(form); setOpen(false); load(); Alert.alert('Done', 'Invoice generated.'); }
    catch (e) { Alert.alert('Error', errorMessage(e)); } finally { setSaving(false); }
  };

  const autoBill = () => {
    Alert.alert('Auto-bill Monthly', 'Generate invoices for all monthly customers?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Generate', onPress: async () => {
        try { await adminBillingApi.autoGenerate('MONTHLY'); load(); Alert.alert('Done', 'Bulk invoices generated.'); }
        catch (e) { Alert.alert('Error', errorMessage(e)); }
      } },
    ]);
  };

  const openPdf = async (inv: Invoice) => {
    try { const { pdfUrl } = await adminBillingApi.pdf(inv.id); Linking.openURL(`${API_BASE}${pdfUrl}`); }
    catch (e) { Alert.alert('Error', errorMessage(e)); }
  };

  const notify = async (inv: Invoice) => {
    try { await adminBillingApi.notify(inv.id); Alert.alert('Sent', 'Notification sent.'); }
    catch (e) { Alert.alert('Error', errorMessage(e)); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={
          <View>
            <PageHeader title="Billing" subtitle="Invoices & automatic billing" />
            <View style={{ marginBottom: 12 }}>
              <PrimaryButton title="Auto-bill Monthly" variant="outline" onPress={autoBill} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <RowCard
            leftIcon="receipt"
            leftColor="#0EA5B5"
            title={item.customer?.name ?? item.invoiceNumber}
            subtitle={`${item.invoiceNumber} · ${dayjs(item.periodStart).format('DD MMM')}–${dayjs(item.periodEnd).format('DD MMM')}`}
            meta={`Total ₹${item.totalAmount} · Due ₹${item.dueAmount}`}
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
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="receipt-text-outline" text="No invoices yet" />}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      />
      <Fab onPress={() => setOpen(true)} />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Generate Invoice</Text>
            <FormInput label="Customer ID" value={form.customerId} onChangeText={set('customerId')} placeholder="Paste a customer UUID" autoCapitalize="none" />
            <FormInput label="Period Start (YYYY-MM-DD)" value={form.periodStart} onChangeText={set('periodStart')} />
            <FormInput label="Period End (YYYY-MM-DD)" value={form.periodEnd} onChangeText={set('periodEnd')} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <View style={{ flex: 1 }}><PrimaryButton title="Cancel" variant="outline" onPress={() => setOpen(false)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title="Generate" onPress={generate} loading={saving} /></View>
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
