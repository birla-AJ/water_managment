import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { Badge, Card, EmptyState, Loader } from '../components/ui';
import { customerTrackingApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

export default function TrackDeliveryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const mapRef = useRef<MapView | null>(null);
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
  const customer = data.delivery.customer;
  const driverPoint = { latitude: loc.latitude, longitude: loc.longitude };
  const customerPoint = customer.latitude != null && customer.longitude != null
    ? { latitude: customer.latitude, longitude: customer.longitude }
    : null;

  const fitMap = () => {
    const points = customerPoint ? [driverPoint, customerPoint] : [driverPoint];
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 70, right: 55, bottom: 70, left: 55 },
      animated: true,
    });
  };

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
      <Card style={styles.mapCard}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: driverPoint.latitude,
            longitude: driverPoint.longitude,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass
          toolbarEnabled={false}
          onMapReady={fitMap}
        >
          <Marker coordinate={driverPoint} title={driver.name} description={driver.vehicle?.number ?? 'Driver'}>
            <View style={styles.driverMarker}><Icon name="truck-fast" size={19} color="#FFFFFF" /></View>
          </Marker>
          {customerPoint && (
            <Marker coordinate={customerPoint} title={customer.name} description={customer.address ?? customer.area ?? 'Delivery location'}>
              <View style={styles.customerMarker}><Icon name="map-marker" size={18} color="#FFFFFF" /></View>
            </Marker>
          )}
          {customerPoint && (
            <Polyline coordinates={[driverPoint, customerPoint]} strokeColor={colors.primary} strokeWidth={4} lineDashPattern={[12, 8]} />
          )}
        </MapView>
        <TouchableOpacity style={styles.recenterBtn} onPress={fitMap} activeOpacity={0.86}>
          <Icon name="crosshairs-gps" size={19} color={colors.primary} />
        </TouchableOpacity>
      </Card>

      <Card>
        <View style={styles.headerRow}>
          <View style={styles.iconBubble}>
            <Icon name="truck-fast" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Your camper is on the way</Text>
            <Text style={styles.sub}>Live driver location is shown inside the app.</Text>
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
        <Text style={styles.meta}>Deliver to: {customer.address ?? customer.area ?? 'Saved delivery location'}</Text>
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
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    mapCard: { padding: 0, overflow: 'hidden' },
    map: { height: 330, width: '100%' },
    recenterBtn: {
      position: 'absolute',
      right: 14,
      top: 14,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 4,
    },
    driverMarker: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    customerMarker: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.error,
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
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
