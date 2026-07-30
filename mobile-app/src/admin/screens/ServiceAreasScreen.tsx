import React, { useCallback, useState } from 'react';
import { View, FlatList, Modal, StyleSheet, Text, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { getCurrentLocation } from '../../services/location';
import { adminServiceAreaApi } from '../api';
import type { ServiceArea } from '../types';
import { PageHeader, RowCard, Fab, Loader, EmptyState, FormInput } from '../components/ui';

const emptyForm = () => ({ name: '', city: '', pincode: '', latitude: '', longitude: '' });

export default function ServiceAreasScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [f, setF] = useState(emptyForm());
  const [nameError, setNameError] = useState('');
  const set = (k: keyof ReturnType<typeof emptyForm>) => (v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    if (k === 'name') setNameError('');
  };

  const load = useCallback(async () => {
    try { setItems(await adminServiceAreaApi.list()); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openCreate = () => { setEditId(null); setF(emptyForm()); setNameError(''); setOpen(true); };
  const openEdit = (a: ServiceArea) => {
    setEditId(a.id);
    setF({
      name: a.name ?? '', city: a.city ?? '', pincode: a.pincode ?? '',
      latitude: a.latitude != null ? String(a.latitude) : '',
      longitude: a.longitude != null ? String(a.longitude) : '',
    });
    setNameError('');
    setOpen(true);
  };

  const detectLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentLocation();
      setF((p) => ({ ...p, latitude: loc.latitude.toFixed(6), longitude: loc.longitude.toFixed(6) }));
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setLocating(false); }
  };

  const save = async () => {
    if (!f.name.trim()) { setNameError(t('admin.serviceAreas.errNameRequired')); return; }
    if (f.pincode && !/^\d{6}$/.test(f.pincode)) { Alert.alert(t('admin.common.error'), t('admin.serviceAreas.errPincode')); return; }
    setSaving(true);
    const payload = {
      name: f.name,
      city: f.city || undefined,
      pincode: f.pincode || undefined,
      latitude: f.latitude ? Number(f.latitude) : undefined,
      longitude: f.longitude ? Number(f.longitude) : undefined,
    };
    try {
      if (editId) await adminServiceAreaApi.update(editId, payload);
      else await adminServiceAreaApi.create(payload);
      setOpen(false); load();
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setSaving(false); }
  };

  const del = (a: ServiceArea) => {
    Alert.alert(t('admin.serviceAreas.deleteTitle'), t('admin.serviceAreas.deleteConfirm', { name: a.name }), [
      { text: t('admin.common.cancel'), style: 'cancel' },
      { text: t('admin.common.delete'), style: 'destructive', onPress: async () => {
        try { await adminServiceAreaApi.remove(a.id); load(); } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
      } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={<PageHeader subtitle={t('admin.serviceAreas.subtitle')} />}
        renderItem={({ item }) => (
          <RowCard
            leftIcon="map-marker-radius"
            leftColor="#0EA5B5"
            title={item.name}
            subtitle={[item.city, item.pincode].filter(Boolean).join(' · ') || t('admin.serviceAreas.noCityPincode')}
            meta={`${t('admin.serviceAreas.distributorCount', { count: item._count?.admins ?? 0 })}${item.latitude != null && item.longitude != null ? ` · ${t('admin.serviceAreas.gpsSet')}` : ''}`}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => openEdit(item)} hitSlop={6}><Icon name="pencil" size={18} color={colors.primary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => del(item)} hitSlop={6}><Icon name="trash-can-outline" size={18} color={colors.error} /></TouchableOpacity>
              </View>
            }
          />
        )}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="map-marker-off-outline" text={t('admin.serviceAreas.empty')} />}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      />
      <Fab onPress={openCreate} />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{editId ? t('admin.serviceAreas.editTitle') : t('admin.serviceAreas.addTitle')}</Text>
            <FormInput label={t('admin.serviceAreas.areaNameLabel')} value={f.name} onChangeText={set('name')} error={nameError} placeholder="Limbodi" />
            <FormInput label={t('admin.serviceAreas.cityLabel')} value={f.city} onChangeText={set('city')} placeholder="Indore" />
            <FormInput label={t('admin.serviceAreas.pincodeLabel')} value={f.pincode} onChangeText={set('pincode')} keyboardType="numeric" placeholder="452001" />
            <TouchableOpacity style={styles.locBtn} onPress={detectLocation} disabled={locating}>
              <Icon name="crosshairs-gps" size={16} color={colors.primary} />
              <Text style={styles.locBtnText}>{locating ? t('admin.serviceAreas.gettingLocation') : t('admin.serviceAreas.useMyLocation')}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><FormInput label={t('admin.serviceAreas.latitude')} value={f.latitude} onChangeText={set('latitude')} keyboardType="numeric" /></View>
              <View style={{ flex: 1 }}><FormInput label={t('admin.serviceAreas.longitude')} value={f.longitude} onChangeText={set('longitude')} keyboardType="numeric" /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <View style={{ flex: 1 }}><PrimaryButton title={t('admin.common.cancel')} variant="outline" onPress={() => setOpen(false)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title={editId ? t('admin.common.update') : t('admin.common.create')} onPress={save} loading={saving} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
    locBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 10 },
    locBtnText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  });
