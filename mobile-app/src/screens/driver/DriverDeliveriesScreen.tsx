import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Linking, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { Card, Badge, Loader, EmptyState } from '../../components/ui';
import { driverApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { getCurrentLocation } from '../../services/location';

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
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [dutyBusy, setDutyBusy] = useState(false);
  const [lastPing, setLastPing] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const dutyRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [worklist, duty] = await Promise.all([
        driverApi.deliveries(),
        driverApi.duty().catch(() => null),
      ]);
      setItems(worklist);
      if (duty) {
        setIsOnDuty(!!duty.isOnDuty);
        dutyRef.current = !!duty.isOnDuty;
        setLastPing(duty.latestLocation?.recordedAt ?? duty.lastSeenAt ?? null);
      }
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sendLocation = useCallback(async () => {
    if (!dutyRef.current) return;
    try {
      const loc = await getCurrentLocation();
      const saved = await driverApi.updateLocation(loc);
      setLastPing(saved.recordedAt ?? new Date().toISOString());
      setLocationError(null);
    } catch (e) {
      setLocationError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    if (!isOnDuty) return;
    dutyRef.current = true;
    sendLocation();
    const id = setInterval(sendLocation, 15_000);
    return () => clearInterval(id);
  }, [isOnDuty, sendLocation]);

  const toggleDuty = async (value: boolean) => {
    setDutyBusy(true);
    try {
      if (value) {
        await getCurrentLocation();
      }
      const duty = await driverApi.setDuty(value);
      setIsOnDuty(!!duty.isOnDuty);
      dutyRef.current = !!duty.isOnDuty;
      setLocationError(null);
      if (value) await sendLocation();
    } catch (e) {
      Alert.alert('Duty update failed', errorMessage(e));
    } finally {
      setDutyBusy(false);
    }
  };

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
      <Card style={styles.dutyCard}>
        <View style={styles.dutyTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dutyTitle}>{isOnDuty ? 'Duty is ON' : 'Duty is OFF'}</Text>
            <Text style={styles.dutyText}>
              {isOnDuty ? 'Live location is shared every 15 seconds.' : 'Start duty before deliveries so admin can track you.'}
            </Text>
          </View>
          <Switch
            value={isOnDuty}
            onValueChange={toggleDuty}
            disabled={dutyBusy}
            trackColor={{ false: colors.border, true: colors.primaryGlow }}
            thumbColor={isOnDuty ? colors.primary : colors.textMuted}
          />
        </View>
        <View style={styles.dutyMetaRow}>
          <Icon name={isOnDuty ? 'map-marker-radius' : 'map-marker-off'} size={16} color={isOnDuty ? colors.success : colors.textMuted} />
          <Text style={styles.dutyMeta}>
            {lastPing ? `Last ping ${dayjs(lastPing).format('hh:mm:ss A')}` : 'No location ping yet'}
          </Text>
        </View>
        {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}
      </Card>

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
    dutyCard: { marginHorizontal: 16, marginTop: 12, marginBottom: 0 },
    dutyTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dutyTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
    dutyText: { color: colors.textMuted, fontSize: 12.5, marginTop: 3 },
    dutyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    dutyMeta: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    locationError: { color: colors.error, fontSize: 12, marginTop: 8, fontWeight: '600' },
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
