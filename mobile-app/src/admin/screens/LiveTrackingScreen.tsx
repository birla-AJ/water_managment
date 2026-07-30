import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import MapView, { Marker, Polyline, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { useAppSelector } from '../../store/hooks';
import { adminTrackingApi, adminManageApi } from '../api';
import type { AdminAccount, LiveTrackingSnapshot, ServiceAreaPolygon } from '../types';
import { StatusChip } from '../components/ui';

type LatLng = { latitude: number; longitude: number };
const DEFAULT_REGION = { latitude: 22.7196, longitude: 75.8577, latitudeDelta: 0.12, longitudeDelta: 0.12 };
const POLY_COLOR = '#0E8C84';

function polygonPath(p: ServiceAreaPolygon): LatLng[] {
  return (p.geoJson.coordinates[0] ?? []).map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}
const hex = (c: string, a: string) => (c?.startsWith('#') ? c + a : c);

export default function LiveTrackingScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const mapRef = useRef<MapView | null>(null);
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [data, setData] = useState<LiveTrackingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);

  const [drawMode, setDrawMode] = useState(false);
  const [draft, setDraft] = useState<LatLng[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [polyName, setPolyName] = useState('');
  const [polyAdminId, setPolyAdminId] = useState('');

  const load = useCallback(async () => {
    try { setData(await adminTrackingApi.live()); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]));

  useEffect(() => {
    if (isSuperAdmin) adminManageApi.list({ limit: 100, role: 'ADMIN' }).then((r) => setAdmins(r.data ?? [])).catch(() => {});
  }, [isSuperAdmin]);

  const allPoints = useMemo(() => {
    const pts: LatLng[] = [];
    data?.drivers.forEach((d) => d.latestLocation && pts.push({ latitude: d.latestLocation.latitude, longitude: d.latestLocation.longitude }));
    data?.customers?.forEach((c) => c.latitude != null && c.longitude != null && pts.push({ latitude: c.latitude, longitude: c.longitude }));
    data?.hubs?.forEach((h) => h.latitude != null && h.longitude != null && pts.push({ latitude: h.latitude, longitude: h.longitude }));
    return pts;
  }, [data]);

  const fitMap = () => {
    if (allPoints.length > 0) {
      mapRef.current?.fitToCoordinates(allPoints, { edgePadding: { top: 60, right: 50, bottom: 60, left: 50 }, animated: true });
    }
  };

  const onMapPress = (e: { nativeEvent: { coordinate: LatLng } }) => {
    if (!drawMode) return;
    setDraft((prev) => [...prev, e.nativeEvent.coordinate]);
  };

  const startSave = () => {
    if (draft.length < 3) { Alert.alert(t('admin.liveTracking.drawPolygonTitle'), t('admin.liveTracking.drawPolygonMsg')); return; }
    setPolyName(''); setPolyAdminId(''); setSaveOpen(true);
  };

  const savePolygon = async () => {
    if (!polyName.trim()) { Alert.alert(t('admin.common.error'), t('admin.liveTracking.errPolygonName')); return; }
    if (isSuperAdmin && !polyAdminId) { Alert.alert(t('admin.common.error'), t('admin.liveTracking.errSelectDistributor')); return; }
    setSaving(true);
    const closed = [...draft, draft[0]];
    try {
      await adminTrackingApi.createPolygon({
        adminId: isSuperAdmin ? polyAdminId : undefined,
        name: polyName.trim(),
        color: POLY_COLOR,
        geoJson: { type: 'Polygon', coordinates: [closed.map((p) => [p.longitude, p.latitude])] },
      });
      setSaveOpen(false); setDrawMode(false); setDraft([]); load();
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setSaving(false); }
  };

  const deletePolygon = (p: ServiceAreaPolygon) => {
    Alert.alert(t('admin.liveTracking.deletePolygonTitle'), t('admin.liveTracking.deletePolygonMsg', { name: p.name }), [
      { text: t('admin.common.cancel'), style: 'cancel' },
      { text: t('admin.common.delete'), style: 'destructive', onPress: async () => {
        try { await adminTrackingApi.removePolygon(p.id); load(); } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
      } },
    ]);
  };

  const onDuty = data?.drivers.filter((d) => d.isOnDuty).length ?? 0;
  const live = data?.drivers.filter((d) => d.isLocationFresh).length ?? 0;
  const activeDeliveries = data?.drivers.reduce((s, d) => s + d.activeDeliveries.length, 0) ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={DEFAULT_REGION}
          onMapReady={fitMap}
          onPress={onMapPress}
          showsCompass
          toolbarEnabled={false}
        >
          {/* Saved service polygons */}
          {(data?.polygons ?? []).map((p) => {
            const path = polygonPath(p);
            if (path.length < 3) return null;
            return <Polygon key={p.id} coordinates={path} strokeColor={p.color} strokeWidth={2} fillColor={hex(p.color, '22')} tappable onPress={() => Alert.alert(p.name, p.admin?.name ?? t('admin.liveTracking.distributor'))} />;
          })}

          {/* Draft polygon */}
          {draft.length >= 3 && <Polygon coordinates={draft} strokeColor={POLY_COLOR} strokeWidth={3} fillColor={hex(POLY_COLOR, '28')} />}
          {draft.length >= 2 && <Polyline coordinates={draft} strokeColor={POLY_COLOR} strokeWidth={3} />}
          {draft.map((pt, i) => (
            <Marker key={`draft-${i}`} coordinate={pt} anchor={{ x: 0.5, y: 0.5 }} onPress={() => setDraft((prev) => prev.filter((_, idx) => idx !== i))}>
              <View style={styles.draftPoint}><Text style={styles.draftPointText}>{i + 1}</Text></View>
            </Marker>
          ))}

          {/* Customers */}
          {(data?.customers ?? []).map((c) => (
            c.latitude != null && c.longitude != null ? (
              <Marker key={`c-${c.id}`} coordinate={{ latitude: c.latitude, longitude: c.longitude }} title={c.name} description={`${c.mobile}${c.driver ? ` · ${c.driver.name}` : ''}`}>
                <View style={[styles.pin, { backgroundColor: '#D32F2F' }]}><Icon name="cellphone" size={15} color="#FFF" /></View>
              </Marker>
            ) : null
          ))}

          {/* Hubs */}
          {(data?.hubs ?? []).map((h) => (
            h.latitude != null && h.longitude != null ? (
              <Marker key={`h-${h.id}`} coordinate={{ latitude: h.latitude, longitude: h.longitude }} title={h.name} description={t('admin.liveTracking.hubDescription')}>
                <View style={[styles.pin, { backgroundColor: '#2563EB' }]}><Text style={{ fontSize: 14 }}>🏭</Text></View>
              </Marker>
            ) : null
          ))}

          {/* Drivers + delivery lines */}
          {(data?.drivers ?? []).map((d) => {
            const loc = d.latestLocation;
            if (!loc) return null;
            const pos = { latitude: loc.latitude, longitude: loc.longitude };
            const fresh = d.isOnDuty && d.isLocationFresh;
            return (
              <React.Fragment key={`d-${d.id}`}>
                <Marker coordinate={pos} title={d.name} description={`${d.vehicle?.number ?? t('admin.liveTracking.noVehicle')} · ${d.isOnDuty ? t('admin.liveTracking.onDuty') : t('admin.liveTracking.offDuty')} · ${dayjs(loc.recordedAt).format('HH:mm')}`}>
                  <View style={[styles.pin, styles.driverPin, { backgroundColor: fresh ? '#179A33' : '#CA8A04' }]}>
                    <Icon name={d.vehicle?.type?.toLowerCase().includes('bike') ? 'motorbike' : 'truck'} size={17} color="#FFF" />
                  </View>
                </Marker>
                {d.activeDeliveries.map((dl) => (
                  dl.customer.latitude != null && dl.customer.longitude != null ? (
                    <Polyline key={dl.id} coordinates={[pos, { latitude: dl.customer.latitude, longitude: dl.customer.longitude }]} strokeColor={colors.primary} strokeWidth={2} lineDashPattern={[8, 6]} />
                  ) : null
                ))}
              </React.Fragment>
            );
          })}
        </MapView>

        {/* Map action buttons */}
        <View style={styles.mapActions}>
          <TouchableOpacity style={styles.mapBtn} onPress={fitMap}><Icon name="crosshairs-gps" size={20} color={colors.primary} /></TouchableOpacity>
          <TouchableOpacity style={styles.mapBtn} onPress={load}><Icon name="refresh" size={20} color={colors.primary} /></TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapBtn, drawMode && { backgroundColor: colors.primary }]}
            onPress={() => { setDrawMode((v) => !v); setDraft([]); }}
          >
            <Icon name="vector-polygon" size={20} color={drawMode ? '#FFF' : colors.primary} />
          </TouchableOpacity>
        </View>

        {drawMode && (
          <View style={styles.drawBar}>
            <Text style={styles.drawHint}>{t('admin.liveTracking.drawHint', { count: draft.length })}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={styles.drawAction} onPress={() => setDraft((p) => p.slice(0, -1))} disabled={!draft.length}>
                <Text style={styles.drawActionText}>{t('admin.liveTracking.undo')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawAction} onPress={() => setDraft([])}>
                <Text style={styles.drawActionText}>{t('admin.liveTracking.clear')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.drawAction, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={startSave}>
                <Text style={[styles.drawActionText, { color: '#FFF' }]}>{t('admin.common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.statsRow}>
          <View style={[styles.stat, { borderColor: colors.success + '55' }]}><Text style={[styles.statVal, { color: colors.success }]}>{onDuty}</Text><Text style={styles.statLbl}>{t('admin.liveTracking.onDuty')}</Text></View>
          <View style={[styles.stat, { borderColor: colors.accent + '55' }]}><Text style={[styles.statVal, { color: colors.accent }]}>{live}</Text><Text style={styles.statLbl}>{t('admin.liveTracking.live')}</Text></View>
          <View style={[styles.stat, { borderColor: colors.warning + '55' }]}><Text style={[styles.statVal, { color: colors.warning }]}>{activeDeliveries}</Text><Text style={styles.statLbl}>{t('admin.liveTracking.deliveries')}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>{t('admin.liveTracking.drivers')}</Text>
        {(data?.drivers ?? []).length === 0 && <Text style={styles.muted}>{loading ? t('admin.common.loading') : t('admin.liveTracking.noDrivers')}</Text>}
        {(data?.drivers ?? []).map((d) => (
          <View key={d.id} style={styles.rowCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{d.name}</Text>
              <Text style={styles.muted}>{d.vehicle?.number ?? t('admin.liveTracking.noVehicle')} · {d.zone ?? t('admin.liveTracking.noZone')}</Text>
              <Text style={styles.muted}>{d.latestLocation ? t('admin.liveTracking.lastPing', { time: dayjs(d.latestLocation.recordedAt).format('HH:mm:ss') }) : t('admin.liveTracking.noLocation')}</Text>
            </View>
            <StatusChip status={d.isOnDuty ? (d.isLocationFresh ? 'ACTIVE' : 'PENDING') : 'INACTIVE'} />
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>{t('admin.liveTracking.servicePolygons')}</Text>
        {(data?.polygons ?? []).length === 0 && <Text style={styles.muted}>{t('admin.liveTracking.noPolygons')}</Text>}
        {(data?.polygons ?? []).map((p) => (
          <View key={p.id} style={styles.rowCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{p.name}</Text>
              <Text style={styles.muted}>{p.admin?.name ?? t('admin.liveTracking.distributor')}</Text>
            </View>
            <TouchableOpacity onPress={() => deletePolygon(p)} hitSlop={8}><Icon name="trash-can-outline" size={20} color={colors.error} /></TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={saveOpen} animationType="slide" transparent onRequestClose={() => setSaveOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('admin.liveTracking.saveTitle')}</Text>
            <Text style={styles.fieldLabel}>{t('admin.liveTracking.polygonName')}</Text>
            <TextInput style={styles.input} value={polyName} onChangeText={setPolyName} placeholder={t('admin.liveTracking.polygonNamePlaceholder')} placeholderTextColor={colors.textMuted} />
            {isSuperAdmin && (
              <>
                <Text style={styles.fieldLabel}>{t('admin.liveTracking.distributor')}</Text>
                <ScrollView style={{ maxHeight: 200 }}>
                  {admins.map((a) => (
                    <TouchableOpacity key={a.id} style={styles.pickRow} onPress={() => setPolyAdminId(a.id)}>
                      <Icon name={polyAdminId === a.id ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={polyAdminId === a.id ? colors.primary : colors.textMuted} />
                      <Text style={styles.rowTitle}>{a.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}><PrimaryButton title={t('admin.common.cancel')} variant="outline" onPress={() => setSaveOpen(false)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title={t('admin.common.save')} onPress={savePolygon} loading={saving} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    mapWrap: { height: '48%', position: 'relative' },
    mapActions: { position: 'absolute', top: 12, right: 12, gap: 10 },
    mapBtn: {
      width: 42, height: 42, borderRadius: 12, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: colors.cardBorder, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
    },
    drawBar: { position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: colors.bgElevated, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 12 },
    drawHint: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
    drawAction: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', backgroundColor: colors.card },
    drawActionText: { fontWeight: '800', color: colors.text, fontSize: 13 },
    pin: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
    driverPin: { width: 34, height: 34, borderRadius: 17 },
    draftPoint: { width: 24, height: 24, borderRadius: 12, backgroundColor: POLY_COLOR, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
    draftPointText: { color: '#FFF', fontWeight: '800', fontSize: 12 },

    panel: { flex: 1, backgroundColor: colors.bg },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    stat: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center' },
    statVal: { fontSize: 22, fontWeight: '800' },
    statLbl: { fontSize: 11, color: colors.textMuted, fontWeight: '700', marginTop: 2 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 },
    rowCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, marginBottom: 8 },
    rowTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    muted: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
    fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '700', marginBottom: 6, marginTop: 6 },
    input: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 14, paddingVertical: 12, color: colors.text },
    pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  });
