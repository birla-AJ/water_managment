import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, Alert, TouchableOpacity, Text } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { errorMessage } from '../../api/client';
import { adminPaymentApi } from '../api';
import type { Payment } from '../types';
import { PageHeader, FilterChips, RowCard, StatusChip, Loader, EmptyState } from '../components/ui';

type PStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export default function PaymentsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const STATUS_FILTERS: { label: string; value: '' | PStatus }[] = [
    { label: t('admin.common.all'), value: '' },
    { label: t('admin.payments.statusSuccess'), value: 'SUCCESS' },
    { label: t('admin.payments.statusPending'), value: 'PENDING' },
    { label: t('admin.payments.statusFailed'), value: 'FAILED' },
    { label: t('admin.payments.statusRefunded'), value: 'REFUNDED' },
  ];
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
    Alert.alert(t('admin.payments.refundTitle'), t('admin.payments.refundConfirm', { amount: p.amount, name: p.customer?.name ?? t('admin.payments.customerFallback') }), [
      { text: t('admin.common.cancel'), style: 'cancel' },
      { text: t('admin.payments.refund'), style: 'destructive', onPress: async () => {
        try { await adminPaymentApi.refund(p.id); load(); } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
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
            <PageHeader subtitle={t('admin.payments.subtitle')} />
            <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <View style={{ height: 8 }} />
          </View>
        }
        renderItem={({ item }) => (
          <RowCard
            leftIcon="credit-card"
            leftColor="#0E8388"
            title={`₹${item.amount} · ${item.customer?.name ?? '—'}`}
            subtitle={`${item.method}${item.invoice ? ` · ${item.invoice.invoiceNumber}` : ''}`}
            meta={dayjs(item.createdAt).format('DD MMM YYYY HH:mm')}
            right={
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <StatusChip status={item.status} />
                {item.status === 'SUCCESS' && (
                  <TouchableOpacity onPress={() => refund(item)}>
                    <Text style={{ color: colors.warning, fontWeight: '800', fontSize: 13 }}>{t('admin.payments.refund')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="credit-card-off-outline" text={t('admin.payments.noPayments')} />}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      />
    </View>
  );
}
