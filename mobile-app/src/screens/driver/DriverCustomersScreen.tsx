import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, Badge, Loader, EmptyState } from '../../components/ui';
import { driverApi } from '../../api/endpoints';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';

interface DriverCustomer {
  id: string;
  name: string;
  mobile: string;
  area?: string;
  address?: string;
  landmark?: string;
  status: string;
  isPaused: boolean;
  allocatedCampers: number;
}

export default function DriverCustomersScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<DriverCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await driverApi.customers());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Loader />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={items}
      keyExtractor={(i) => i.id}
      onRefresh={load}
      refreshing={loading}
      ListEmptyComponent={<EmptyState text="No customers assigned to you yet" />}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <Card>
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            {item.isPaused ? <Badge status="PAUSED" /> : <Badge status={item.status} />}
          </View>
          <Text style={styles.meta}>{item.area ?? '—'}{item.address ? ` · ${item.address}` : ''}</Text>
          {item.landmark ? <Text style={styles.meta}>Landmark: {item.landmark}</Text> : null}
          <Text style={styles.meta}>{item.allocatedCampers} camper(s) / delivery</Text>
          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${item.mobile}`)}>
            <Icon name="phone" size={16} color={colors.primary} />
            <Text style={styles.callText}>{item.mobile}</Text>
          </TouchableOpacity>
        </Card>
      )}
    />
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    name: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
    meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    callText: { color: colors.primary, fontWeight: '700' },
  });
