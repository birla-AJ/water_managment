import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Card, Badge, Loader, EmptyState } from '../components/ui';
import { deliveryApi } from '../api/endpoints';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

export default function DeliveriesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
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
            <Text style={[styles.toggleText, period === p && { color: onPrimary }]}>{p === 'week' ? t('common.thisWeek') : t('common.thisMonth')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {summary && (
        <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={styles.sumItem}><Text style={styles.sumNum}>{summary.count}</Text><Text style={styles.sumLabel}>{t('deliveries.deliveriesCount')}</Text></View>
          <View style={styles.sumItem}><Text style={styles.sumNum}>{summary.totalDelivered}</Text><Text style={styles.sumLabel}>{t('deliveries.campers')}</Text></View>
        </Card>
      )}

      {/* Water is opt-in — the calendar is where the customer asks for it. */}
      <TouchableOpacity
        style={styles.manageRow}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DeliveryCalendar', { view: period })}
      >
        <Icon name="calendar-check" size={20} color={colors.primary} />
        <Text style={styles.manageText}>{t('deliveries.manageText')}</Text>
        <Icon name="chevron-right" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {loading ? (
        <Loader />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          ListEmptyComponent={<EmptyState text={t('deliveries.empty')} />}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.row}>
                <Text style={styles.date}>{item.deliveryDate ? dayjs(item.deliveryDate).format('DD MMM YYYY') : '—'}</Text>
                <Badge status={item.status} />
              </View>
              <Text style={styles.meta}>{item.order?.orderNumber} · {t('common.camperUnit', { count: item.quantityDelivered })}</Text>
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
    manageRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12,
      paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
      backgroundColor: colors.primary + '14', borderWidth: 1, borderColor: colors.primary + '33',
    },
    manageText: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 13.5 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    date: { fontWeight: '700', color: colors.text, fontSize: 15 },
    meta: { color: colors.textMuted, marginTop: 6 },
  });
