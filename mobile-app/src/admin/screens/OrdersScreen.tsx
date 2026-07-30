import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import dayjs from 'dayjs';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { errorMessage } from '../../api/client';
import { adminOrderApi } from '../api';
import type { Order, OrderStatus } from '../types';
import { PageHeader, FilterChips, RowCard, StatusChip, Loader, EmptyState } from '../components/ui';

const STATUSES: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PROCESSING', 'DELIVERED', 'CANCELLED'];

export default function OrdersScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const STATUS_FILTERS: { label: string; value: '' | OrderStatus }[] = [
    { label: t('admin.common.all'), value: '' },
    ...STATUSES.map((s) => ({ label: t(`admin.orders.status.${s.toLowerCase()}`), value: s })),
  ];
  const [items, setItems] = useState<Order[]>([]);
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminOrderApi.list({ status: status || undefined, page: 1, limit: 100 });
      setItems(res.data ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const changeStatus = (order: Order) => {
    Alert.alert(
      t('admin.orders.orderTitle', { number: order.orderNumber }),
      t('admin.orders.updateStatusTo'),
      [
        ...STATUSES.map((s) => ({
          text: t(`admin.orders.status.${s.toLowerCase()}`),
          onPress: async () => {
            try { await adminOrderApi.updateStatus(order.id, s); load(); }
            catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
          },
        })),
        { text: t('admin.common.cancel'), style: 'cancel' as const },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <PageHeader subtitle={t('admin.orders.subtitle')} />
            <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <View style={{ height: 8 }} />
          </View>
        }
        renderItem={({ item }) => (
          <RowCard
            leftIcon={item.type === 'EXTRA' ? 'cart-plus' : 'cart'}
            leftColor={item.type === 'EXTRA' ? '#0C7C82' : colors.primary}
            title={item.customer?.name ?? item.orderNumber}
            subtitle={`${item.orderNumber} · Qty ${item.quantity}`}
            meta={`${item.type} · ${dayjs(item.orderDate).format('DD MMM YYYY')}`}
            right={<StatusChip status={item.status} />}
            onPress={() => changeStatus(item)}
          />
        )}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="cart-off" text={t('admin.orders.noOrders')} />}
        refreshControl={
          <RefreshControl
            tintColor={colors.primary}
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
          />
        }
      />
    </View>
  );
}
