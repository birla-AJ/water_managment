import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { Card, Badge, Loader, EmptyState } from '../../components/ui';
import { driverApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';

interface WorklistItem {
  customer: { id: string; name: string; mobile: string; area?: string; address?: string; landmark?: string; allocatedCampers: number };
  order: { id: string; orderNumber: string; quantity: number; status: string; type: string } | null;
  delivery: { id: string; status: string; quantityDelivered: number; emptyCollected: number } | null;
  skipped: boolean;
  deliverable: boolean;
}

export default function DriverDeliveriesScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<WorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await driverApi.deliveries());
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markDelivered = (item: WorklistItem) => {
    if (!item.order) return;
    Alert.alert(
      'Confirm delivery',
      `Mark ${item.order.quantity} camper(s) delivered to ${item.customer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delivered',
          onPress: async () => {
            setBusyId(item.order!.id);
            try {
              await driverApi.markDelivered({ orderId: item.order!.id, status: 'DELIVERED', quantityDelivered: item.order!.quantity });
              await load();
            } catch (e) {
              Alert.alert('Error', errorMessage(e));
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const pending = items.filter((i) => i.deliverable).length;
  const skipped = items.filter((i) => i.skipped).length;

  return (
    <View style={styles.container}>
      <Card style={{ flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginTop: 12 }}>
        <View style={styles.sumItem}><Text style={styles.sumNum}>{items.length}</Text><Text style={styles.sumLabel}>Stops</Text></View>
        <View style={styles.sumItem}><Text style={styles.sumNum}>{pending}</Text><Text style={styles.sumLabel}>To deliver</Text></View>
        <View style={styles.sumItem}><Text style={[styles.sumNum, { color: colors.warning }]}>{skipped}</Text><Text style={styles.sumLabel}>Skipped</Text></View>
      </Card>

      {loading ? (
        <Loader />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.customer.id}
          ListEmptyComponent={<EmptyState text="No customers assigned for today" />}
          contentContainerStyle={{ padding: 16 }}
          onRefresh={load}
          refreshing={loading}
          renderItem={({ item }) => {
            const delivered = item.delivery?.status === 'DELIVERED';
            return (
              <Card style={item.skipped ? { opacity: 0.6 } : undefined}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.customer.name}</Text>
                  {item.skipped ? <Badge status="SKIPPED" /> : delivered ? <Badge status="DELIVERED" /> : item.order ? <Badge status="PENDING" /> : <Badge status="NO ORDER" />}
                </View>
                <Text style={styles.meta}>{item.customer.area ?? '—'}{item.customer.address ? ` · ${item.customer.address}` : ''}</Text>
                {item.customer.landmark ? <Text style={styles.meta}>Landmark: {item.customer.landmark}</Text> : null}
                {item.order ? <Text style={styles.meta}>{item.order.orderNumber} · {item.order.quantity} camper(s)</Text> : null}

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${item.customer.mobile}`)}>
                    <Icon name="phone" size={18} color={colors.primary} />
                    <Text style={styles.iconBtnText}>Call</Text>
                  </TouchableOpacity>
                  {item.deliverable && (
                    <TouchableOpacity
                      style={[styles.iconBtn, styles.deliverBtn]}
                      disabled={busyId === item.order?.id}
                      onPress={() => markDelivered(item)}
                    >
                      <Icon name="check-circle" size={18} color="#FFFFFF" />
                      <Text style={[styles.iconBtnText, { color: '#FFFFFF' }]}>{busyId === item.order?.id ? 'Saving…' : 'Delivered'}</Text>
                    </TouchableOpacity>
                  )}
                  {item.skipped && (
                    <View style={styles.skipNote}><Text style={styles.skipNoteText}>Customer skipped — do not visit</Text></View>
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}
      <Text style={styles.footer}>{dayjs().format('dddd, DD MMM YYYY')}</Text>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    sumItem: { alignItems: 'center' },
    sumNum: { fontSize: 22, fontWeight: '800', color: colors.text },
    sumLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    name: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
    meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    actions: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10, flexWrap: 'wrap' },
    iconBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary },
    iconBtnText: { color: colors.primary, fontWeight: '700' },
    deliverBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
    skipNote: { paddingVertical: 6 },
    skipNoteText: { color: colors.warning, fontWeight: '700', fontSize: 12 },
    footer: { textAlign: 'center', color: colors.textMuted, fontSize: 12, paddingVertical: 8 },
  });
