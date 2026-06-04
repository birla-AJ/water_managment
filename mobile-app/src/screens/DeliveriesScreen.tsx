import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { Card, Badge, Loader, EmptyState } from '../components/ui';
import { deliveryApi } from '../api/endpoints';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

export default function DeliveriesScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const onPrimary = '#FFFFFF';
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = dayjs().startOf(period).toISOString();
      const to = dayjs().endOf(period).toISOString();
      const [list, sum] = await Promise.all([deliveryApi.list({ from, to }), deliveryApi.summary(period)]);
      setItems(list);
      setSummary(sum);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <View style={styles.toggle}>
        {(['week', 'month'] as const).map((p) => (
          <TouchableOpacity key={p} style={[styles.toggleBtn, period === p && styles.toggleActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.toggleText, period === p && { color: onPrimary }]}>{p === 'week' ? 'This Week' : 'This Month'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {summary && (
        <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={styles.sumItem}><Text style={styles.sumNum}>{summary.count}</Text><Text style={styles.sumLabel}>Deliveries</Text></View>
          <View style={styles.sumItem}><Text style={styles.sumNum}>{summary.totalDelivered}</Text><Text style={styles.sumLabel}>Campers</Text></View>
        </Card>
      )}

      {loading ? (
        <Loader />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          ListEmptyComponent={<EmptyState text="No deliveries in this period" />}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.row}>
                <Text style={styles.date}>{item.deliveryDate ? dayjs(item.deliveryDate).format('DD MMM YYYY') : '—'}</Text>
                <Badge status={item.status} />
              </View>
              <Text style={styles.meta}>{item.order?.orderNumber} · {item.quantityDelivered} camper(s)</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    toggle: { flexDirection: 'row', margin: 16, backgroundColor: colors.card, borderRadius: 24, padding: 4, borderWidth: 1, borderColor: colors.cardBorder },
    toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
    toggleActive: { backgroundColor: colors.primary },
    toggleText: { color: colors.textMuted, fontWeight: '700' },
    sumItem: { alignItems: 'center' },
    sumNum: { fontSize: 26, fontWeight: '800', color: colors.primary },
    sumLabel: { color: colors.textMuted },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    date: { fontWeight: '700', color: colors.text, fontSize: 15 },
    meta: { color: colors.textMuted, marginTop: 6 },
  });
