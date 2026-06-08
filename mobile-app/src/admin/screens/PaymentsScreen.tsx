import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, Alert, TouchableOpacity, Text } from 'react-native';
import dayjs from 'dayjs';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { errorMessage } from '../../api/client';
import { adminPaymentApi } from '../api';
import type { Payment } from '../types';
import { PageHeader, FilterChips, RowCard, StatusChip, Loader, EmptyState } from '../components/ui';

type PStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
const STATUS_FILTERS: { label: string; value: '' | PStatus }[] = [
  { label: 'All', value: '' },
  { label: 'Success', value: 'SUCCESS' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

export default function PaymentsScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<Payment[]>([]);
  const [status, setStatus] = useState<'' | PStatus>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const r = await adminPaymentApi.list({ status: status || undefined, limit: 100 }); setItems(r.data ?? []); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refund = (p: Payment) => {
    Alert.alert('Refund payment', `Refund ₹${p.amount} to ${p.customer?.name ?? 'customer'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Refund', style: 'destructive', onPress: async () => {
        try { await adminPaymentApi.refund(p.id); load(); } catch (e) { Alert.alert('Error', errorMessage(e)); }
      } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <PageHeader title="Payments" subtitle="Razorpay & manual payments" />
            <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <View style={{ height: 8 }} />
          </View>
        }
        renderItem={({ item }) => (
          <RowCard
            leftIcon="credit-card"
            leftColor="#10B981"
            title={`₹${item.amount} · ${item.customer?.name ?? '—'}`}
            subtitle={`${item.method}${item.invoice ? ` · ${item.invoice.invoiceNumber}` : ''}`}
            meta={dayjs(item.createdAt).format('DD MMM YYYY HH:mm')}
            right={
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <StatusChip status={item.status} />
                {item.status === 'SUCCESS' && (
                  <TouchableOpacity onPress={() => refund(item)}>
                    <Text style={{ color: colors.warning, fontWeight: '800', fontSize: 13 }}>Refund</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="credit-card-off-outline" text="No payments found" />}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      />
    </View>
  );
}
