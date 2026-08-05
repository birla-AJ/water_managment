import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Card, Badge, Loader, EmptyState } from '../components/ui';
import { orderApi } from '../api/endpoints';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

export default function OrderHistoryScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await orderApi.list({ limit: 100 })); } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<EmptyState text={t('orderHistory.empty')} />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.num}>{item.orderNumber}</Text>
              <Badge status={item.status} />
            </View>
            <Text style={styles.meta}>{dayjs(item.orderDate).format('DD MMM YYYY')} · {item.type} · {t('common.camperUnit', { count: item.quantity })}</Text>
            {item.remarks ? <Text style={styles.remarks}>“{item.remarks}”</Text> : null}
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
    num: { fontWeight: '800', color: colors.text },
    meta: { color: colors.textMuted, marginTop: 6 },
    remarks: { color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  });
