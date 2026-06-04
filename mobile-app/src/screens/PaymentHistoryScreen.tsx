import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { Card, Badge, Loader, EmptyState } from '../components/ui';
import { paymentApi } from '../api/endpoints';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

export default function PaymentHistoryScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await paymentApi.list()); } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<EmptyState text="No payments yet" />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.amount}>₹{item.amount}</Text>
              <Badge status={item.status} />
            </View>
            <Text style={styles.meta}>{dayjs(item.createdAt).format('DD MMM YYYY HH:mm')} · {item.method}</Text>
            {item.invoice?.invoiceNumber ? <Text style={styles.meta}>Invoice {item.invoice.invoiceNumber}</Text> : null}
          </Card>
        )}
      />
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amount: { fontWeight: '800', color: colors.text, fontSize: 18 },
    meta: { color: colors.textMuted, marginTop: 6 },
  });
