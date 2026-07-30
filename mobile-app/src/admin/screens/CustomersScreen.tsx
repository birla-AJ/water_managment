import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { adminCustomerApi } from '../api';
import type { Customer, CustomerStatus } from '../types';
import {
  PageHeader, SearchBar, FilterChips, RowCard, StatusChip, Fab, Loader, EmptyState,
} from '../components/ui';
import type { AdminStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'Customers'>;

export default function CustomersScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();

  const STATUS_FILTERS: { label: string; value: '' | CustomerStatus }[] = [
    { label: t('admin.common.all'), value: '' },
    { label: t('admin.common.active'), value: 'ACTIVE' },
    { label: t('admin.common.inactive'), value: 'INACTIVE' },
  ];

  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | CustomerStatus>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminCustomerApi.list({ search, status: status || undefined, page: 1, limit: 100 });
      setItems(res.data ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [search, status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={
          <View>
            <PageHeader subtitle={t('admin.customers.subtitle')} />
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('admin.customers.searchPlaceholder')} />
            <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <View style={{ height: 8 }} />
          </View>
        }
        renderItem={({ item }) => (
          <RowCard
            leftIcon="account"
            title={item.name}
            subtitle={`${item.mobile}${item.area ? ` · ${item.area}` : ''}`}
            meta={`${item.customerType} · ${item.allocatedCampers} campers · ₹${item.ratePerCamper}/camper`}
            right={<StatusChip status={item.status} />}
            onPress={() => navigation.navigate('CustomerDetails', { id: item.id })}
          />
        )}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="account-off" text={t('admin.customers.empty')} />}
        refreshControl={
          <RefreshControl
            tintColor={colors.primary}
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
          />
        }
      />
      {/* This screen is inside the tab navigator while the AI button is mounted
          above it. The negative offset compensates for the tab container so
          both buttons share the same visual baseline. */}
      <Fab side="left" bottom={20} onPress={() => navigation.navigate('CustomerForm', {})} />
    </View>
  );
}
