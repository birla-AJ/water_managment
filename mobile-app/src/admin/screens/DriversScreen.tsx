import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { adminDriverApi } from '../api';
import type { Driver, DriverStatus } from '../types';
import { PageHeader, SearchBar, FilterChips, RowCard, StatusChip, Fab, Loader, EmptyState } from '../components/ui';
import type { AdminStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'Drivers'>;

const STATUS_FILTERS: { label: string; value: '' | DriverStatus }[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
];

export default function DriversScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | DriverStatus>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminDriverApi.list({ search, status: status || undefined, page: 1, limit: 100 });
      setItems(res.data ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [search, status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={
          <View>
            <PageHeader title="Drivers" subtitle="Manage delivery drivers, vehicles and zones" />
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search name / mobile" />
            <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <View style={{ height: 8 }} />
          </View>
        }
        renderItem={({ item }) => (
          <RowCard
            leftIcon="truck"
            leftColor="#3B82F6"
            title={item.name}
            subtitle={`${item.mobile}${item.zone ? ` · ${item.zone}` : ''}`}
            meta={`${item.vehicle?.number ?? 'No vehicle'} · ${item._count?.customers ?? item.customers?.length ?? 0} customers`}
            right={<StatusChip status={item.status} />}
            onPress={() => navigation.navigate('DriverDetails', { id: item.id })}
          />
        )}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="truck-remove" text="No drivers found" />}
        refreshControl={
          <RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />
        }
      />
      <Fab onPress={() => navigation.navigate('DriverForm', {})} />
    </View>
  );
}
