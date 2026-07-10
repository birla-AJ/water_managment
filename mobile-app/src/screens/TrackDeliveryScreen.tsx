import React, { useCallback, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { Badge, Card, EmptyState, Loader, PrimaryButton } from '../components/ui';
import { customerTrackingApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

export default function TrackDeliveryScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await customerTrackingApi.activeDelivery());
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openMap = () => {
    const loc = data?.latestLocation;
    if (!loc) return;
    Linking.openURL(`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=16/${loc.latitude}/${loc.longitude}`);
  };

  if (loading) return <Loader />;

  if (!data?.trackable) {
    return (
      <View style={styles.container}>
        <EmptyState text={data?.reason ?? 'No active delivery to track right now.'} />
      </View>
    );
  }

  const driver = data.driver;
  const loc = data.latestLocation;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
        />
      }
    >
      <Card>
        <View style={styles.headerRow}>
          <View style={styles.iconBubble}>
            <Icon name="truck-fast" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Your camper is on the way</Text>
            <Text style={styles.sub}>Exact driver location is visible only for this active delivery.</Text>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.row}>
          <Text style={styles.section}>Delivery</Text>
          <Badge status={data.delivery.status} />
        </View>
        <Text style={styles.meta}>Order: {data.delivery.order.orderNumber}</Text>
        <Text style={styles.meta}>Quantity: {data.delivery.order.quantity} camper(s)</Text>
      </Card>

      <Card>
        <Text style={styles.section}>Driver</Text>
        <Text style={styles.driverName}>{driver.name}</Text>
        <Text style={styles.meta}>Vehicle: {driver.vehicle?.number ?? 'Not assigned'}{driver.vehicle?.type ? ` (${driver.vehicle.type})` : ''}</Text>
        <Text style={styles.meta}>Last location: {dayjs(loc.recordedAt).format('DD MMM, hh:mm:ss A')}</Text>
        <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${driver.mobile}`)}>
          <Icon name="phone" size={18} color={colors.primary} />
          <Text style={styles.callText}>Call Driver</Text>
        </TouchableOpacity>
      </Card>

      <Card>
        <Text style={styles.section}>ETA</Text>
        <View style={styles.etaRow}>
          <View style={styles.etaBox}>
            <Text style={styles.etaNum}>{data.etaMinutes ?? '—'}</Text>
            <Text style={styles.etaLabel}>Minutes</Text>
          </View>
          <View style={styles.etaBox}>
            <Text style={styles.etaNum}>{data.distanceKm ?? '—'}</Text>
            <Text style={styles.etaLabel}>Km away</Text>
          </View>
        </View>
        {!data.etaMinutes ? (
          <Text style={styles.note}>Add customer GPS location to calculate distance and ETA.</Text>
        ) : data.etaSource === 'GOOGLE_MAPS' ? (
          <Text style={styles.note}>ETA uses Google Maps driving distance from the latest driver location.</Text>
        ) : (
          <Text style={styles.note}>ETA is estimated using live GPS distance because road ETA is unavailable right now.</Text>
        )}
      </Card>

      <PrimaryButton title="Open Driver Location on Map" onPress={openMap} />
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBubble: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    title: { fontSize: 20, fontWeight: '800', color: colors.text },
    sub: { color: colors.textMuted, fontSize: 12.5, marginTop: 4, lineHeight: 18 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    section: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
    meta: { color: colors.textMuted, fontSize: 13.5, marginTop: 4 },
    driverName: { color: colors.text, fontSize: 18, fontWeight: '800' },
    callBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: colors.primary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
    callText: { color: colors.primary, fontWeight: '800' },
    etaRow: { flexDirection: 'row', gap: 12 },
    etaBox: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    etaNum: { color: colors.primary, fontWeight: '900', fontSize: 30 },
    etaLabel: { color: colors.textMuted, fontWeight: '700', marginTop: 4 },
    note: { color: colors.textMuted, fontSize: 12, marginTop: 12, lineHeight: 17 },
  });
