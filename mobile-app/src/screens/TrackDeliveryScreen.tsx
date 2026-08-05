import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Badge, Card, EmptyState, Loader } from '../components/ui';
import { customerTrackingApi, meApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';
import { getCurrentLocation } from '../services/location';

export default function TrackDeliveryScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const mapRef = useRef<MapView | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const askedForLocationRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await customerTrackingApi.activeDelivery());
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveCurrentDeliveryLocation = useCallback(async (showSuccess = true) => {
    if (savingLocation) return;
    setSavingLocation(true);
    try {
      const loc = await getCurrentLocation();
      await meApi.updateProfile({ latitude: loc.latitude, longitude: loc.longitude });
      setData((prev: any) => {
        if (!prev?.delivery?.customer) return prev;
        return {
          ...prev,
          delivery: {
            ...prev.delivery,
            customer: {
              ...prev.delivery.customer,
              latitude: loc.latitude,
              longitude: loc.longitude,
            },
          },
        };
      });
      await load();
      if (showSuccess) Alert.alert(t('trackDelivery.locationSavedTitle'), t('trackDelivery.locationSavedMsg'));
    } catch (e) {
      if (showSuccess) Alert.alert(t('trackDelivery.locationErrorTitle'), errorMessage(e));
    } finally {
      setSavingLocation(false);
    }
  }, [load, savingLocation]);

  useEffect(() => {
    const customer = data?.delivery?.customer;
    const missingCustomerGps = data?.trackable && (customer?.latitude == null || customer?.longitude == null);
    if (!missingCustomerGps || askedForLocationRef.current) return;
    askedForLocationRef.current = true;
    saveCurrentDeliveryLocation(false);
  }, [data, saveCurrentDeliveryLocation]);

  if (loading) return <Loader />;

  if (!data?.trackable) {
    return (
      <View style={styles.container}>
        <EmptyState text={data?.reason ?? t('trackDelivery.noActive')} />
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
  const hub = data.distributorHub;
  const hubPoint = hub?.latitude != null && hub?.longitude != null
    ? { latitude: hub.latitude, longitude: hub.longitude }
    : null;

  const fitMap = () => {
    const points = [driverPoint, customerPoint, hubPoint].filter(Boolean) as Array<{ latitude: number; longitude: number }>;
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
          <Marker coordinate={driverPoint} title={driver.name} description={driver.vehicle?.number ?? t('trackDelivery.driverMarkerDefault')}>
            <View style={styles.driverMarker}><Icon name="truck-fast" size={19} color="#FFFFFF" /></View>
          </Marker>
          {customerPoint && (
            <Marker coordinate={customerPoint} title={customer.name} description={customer.address ?? customer.area ?? t('trackDelivery.customerMarkerDefault')}>
              <View style={styles.customerMarker}><Icon name="map-marker" size={18} color="#FFFFFF" /></View>
            </Marker>
          )}
          {hubPoint && (
            <Marker coordinate={hubPoint} title={hub.name} description={t('trackDelivery.hubMarkerDefault')}>
              <View style={styles.hubMarker}><Text style={styles.hubEmoji}>🏭</Text></View>
            </Marker>
          )}
          {customerPoint && (
            <Polyline coordinates={[driverPoint, customerPoint]} strokeColor={colors.primary} strokeWidth={4} lineDashPattern={[12, 8]} />
          )}
          {hubPoint && (
            <Polyline coordinates={[hubPoint, driverPoint]} strokeColor="#2563EB" strokeWidth={3} lineDashPattern={[6, 8]} />
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
            <Text style={styles.title}>{t('trackDelivery.onTheWay')}</Text>
            <Text style={styles.sub}>{t('trackDelivery.liveLocationNote')}</Text>
          </View>
        </View>
      </Card>

      {!customerPoint && (
        <Card style={styles.locationCard}>
          <View style={styles.headerRow}>
            <View style={styles.locationIcon}>
              <Icon name="crosshairs-gps" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.section}>{t('trackDelivery.saveLocationTitle')}</Text>
              <Text style={styles.sub}>{t('trackDelivery.saveLocationSub')}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.locationBtn} onPress={() => saveCurrentDeliveryLocation(true)} disabled={savingLocation} activeOpacity={0.86}>
            {savingLocation ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="map-marker-check" size={18} color="#FFFFFF" />}
            <Text style={styles.locationBtnText}>{savingLocation ? t('trackDelivery.savingLocation') : t('trackDelivery.useCurrentLocation')}</Text>
          </TouchableOpacity>
        </Card>
      )}

      <Card>
        <View style={styles.row}>
          <Text style={styles.section}>{t('trackDelivery.delivery')}</Text>
          <Badge status={data.delivery.status} />
        </View>
        <Text style={styles.meta}>{t('trackDelivery.order', { number: data.delivery.order.orderNumber })}</Text>
        <Text style={styles.meta}>{t('trackDelivery.quantity', { count: data.delivery.order.quantity })}</Text>
        <Text style={styles.meta}>{t('trackDelivery.deliverTo', { address: customer.address ?? customer.area ?? t('trackDelivery.savedLocationFallback') })}</Text>
      </Card>

      <Card>
        <Text style={styles.section}>{t('trackDelivery.driver')}</Text>
        <Text style={styles.driverName}>{driver.name}</Text>
        <Text style={styles.meta}>{t('trackDelivery.vehicle', { info: `${driver.vehicle?.number ?? t('trackDelivery.notAssigned')}${driver.vehicle?.type ? ` (${driver.vehicle.type})` : ''}` })}</Text>
        <Text style={styles.meta}>{t('trackDelivery.lastLocation', { time: dayjs(loc.recordedAt).format('DD MMM, hh:mm:ss A') })}</Text>
        <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${driver.mobile}`)}>
          <Icon name="phone" size={18} color={colors.primary} />
          <Text style={styles.callText}>{t('trackDelivery.callDriver')}</Text>
        </TouchableOpacity>
      </Card>

      {hubPoint && (
        <Card>
          <Text style={styles.section}>{t('trackDelivery.distributorHub')}</Text>
          <Text style={styles.driverName}>{hub.name}</Text>
          <Text style={styles.meta}>{t('trackDelivery.hubNote')}</Text>
          {hub.phone ? (
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${hub.phone}`)}>
              <Icon name="phone" size={18} color={colors.primary} />
              <Text style={styles.callText}>{t('trackDelivery.callDistributor')}</Text>
            </TouchableOpacity>
          ) : null}
        </Card>
      )}

      <Card>
        <Text style={styles.section}>{t('trackDelivery.eta')}</Text>
        <View style={styles.etaRow}>
          <View style={styles.etaBox}>
            <Text style={styles.etaNum}>{data.etaMinutes ?? '—'}</Text>
            <Text style={styles.etaLabel}>{t('trackDelivery.minutes')}</Text>
          </View>
          <View style={styles.etaBox}>
            <Text style={styles.etaNum}>{data.distanceKm ?? '—'}</Text>
            <Text style={styles.etaLabel}>{t('trackDelivery.kmAway')}</Text>
          </View>
        </View>
        {!data.etaMinutes ? (
          <Text style={styles.note}>{t('trackDelivery.etaMissing')}</Text>
        ) : data.etaSource === 'GOOGLE_MAPS' ? (
          <Text style={styles.note}>{t('trackDelivery.etaGoogle')}</Text>
        ) : (
          <Text style={styles.note}>{t('trackDelivery.etaFallback')}</Text>
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
    hubMarker: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2563EB',
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    hubEmoji: { fontSize: 18 },
    locationCard: { borderColor: colors.primary, borderWidth: 1 },
    locationIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryGlow },
    locationBtn: { marginTop: 14, height: 48, borderRadius: 16, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    locationBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
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
