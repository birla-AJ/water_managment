import React, { useCallback, useState } from 'react';
import { View, FlatList, Modal, ScrollView, StyleSheet, Text, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { getCurrentLocation } from '../../services/location';
import { useAppSelector } from '../../store/hooks';
import { adminManageApi, adminServiceAreaApi } from '../api';
import type { AdminAccount, ServiceArea } from '../types';
import { PageHeader, RowCard, StatusChip, Fab, Loader, EmptyState, FormInput } from '../components/ui';
import type { AdminStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'Admins'>;

const splitCsv = (s?: string): string[] => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

const emptyForm = () => ({
  name: '', email: '', password: '', phone: '', mobile: '', isActive: true,
  latitude: '', longitude: '', serviceRadiusKm: '5', pincodes: '', serviceAreas: '',
});

export default function AdminsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const me = useAppSelector((s) => s.auth.user);

  const [items, setItems] = useState<AdminAccount[]>([]);
  const [masterAreas, setMasterAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [f, setF] = useState(emptyForm());
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const set = (k: keyof ReturnType<typeof emptyForm>) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    try {
      const [r, areas] = await Promise.all([
        adminManageApi.list({ limit: 100, role: 'ADMIN' }),
        adminServiceAreaApi.list().catch(() => []),
      ]);
      setItems(r.data ?? []);
      setMasterAreas(areas);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openCreate = () => {
    setEditId(null); setAreaIds([]); setF(emptyForm()); setErrors({}); setOpen(true);
  };
  const openEdit = (a: AdminAccount) => {
    setEditId(a.id);
    setAreaIds(a.areaLinks?.map((l) => l.id) ?? []);
    setF({
      name: a.name ?? '', email: a.email ?? '', password: '',
      phone: a.phone ?? '', mobile: a.mobile ?? '', isActive: a.isActive !== false,
      latitude: a.latitude != null ? String(a.latitude) : '',
      longitude: a.longitude != null ? String(a.longitude) : '',
      serviceRadiusKm: a.serviceRadiusKm != null ? String(a.serviceRadiusKm) : '',
      pincodes: (a.pincodes ?? []).join(', '),
      serviceAreas: (a.serviceAreas ?? []).join(', '),
    });
    setErrors({});
    setOpen(true);
  };

  const detectLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentLocation();
      setF((p) => ({ ...p, latitude: loc.latitude.toFixed(6), longitude: loc.longitude.toFixed(6) }));
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setLocating(false); }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (f.name.trim().length < 2) e.name = t('admin.admins.errNameMin');
    if (!editId) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = t('admin.admins.errEmail');
      if (f.password.length < 6) e.password = t('admin.admins.errPasswordMin');
    } else if (f.password && f.password.length < 6) {
      e.password = t('admin.admins.errPasswordMin');
    }
    if (f.mobile && !/^[6-9]\d{9}$/.test(f.mobile)) Alert.alert(t('admin.common.error'), t('admin.admins.errMobile'));
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    const base = {
      name: f.name,
      role: 'ADMIN' as const,
      phone: f.phone || undefined,
      mobile: f.mobile || undefined,
      isActive: f.isActive,
      latitude: f.latitude ? Number(f.latitude) : null,
      longitude: f.longitude ? Number(f.longitude) : null,
      serviceRadiusKm: f.serviceRadiusKm ? Number(f.serviceRadiusKm) : null,
      pincodes: splitCsv(f.pincodes),
      serviceAreas: splitCsv(f.serviceAreas),
      areaIds,
    };
    try {
      if (editId) await adminManageApi.update(editId, { ...base, ...(f.password ? { password: f.password } : {}) });
      else await adminManageApi.create({ ...base, email: f.email, password: f.password });
      setOpen(false); load();
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setSaving(false); }
  };

  const del = (a: AdminAccount) => {
    if (a.id === me?.id) { Alert.alert(t('admin.admins.notAllowedTitle'), t('admin.admins.cannotDeleteSelf')); return; }
    Alert.alert(t('admin.admins.deleteTitle'), t('admin.admins.deleteConfirm', { name: a.name }), [
      { text: t('admin.common.cancel'), style: 'cancel' },
      { text: t('admin.common.delete'), style: 'destructive', onPress: async () => {
        try { await adminManageApi.remove(a.id); load(); } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
      } },
    ]);
  };

  const toggleArea = (id: string) => setAreaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={<PageHeader subtitle={t('admin.admins.subtitle')} />}
        renderItem={({ item }) => (
          <RowCard
            leftIcon="shield-account"
            leftColor="#0E8388"
            title={item.name}
            subtitle={item.email}
            meta={`${item.mobile ?? t('admin.admins.noMobile')} · ${t('admin.admins.customersCount', { count: item._count?.customers ?? 0 })}`}
            onPress={() => navigation.navigate('AdminDetails', { id: item.id })}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <StatusChip status={item.isActive === false ? 'INACTIVE' : 'ACTIVE'} />
                <TouchableOpacity onPress={() => openEdit(item)} hitSlop={6}><Icon name="pencil" size={18} color={colors.primary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => del(item)} hitSlop={6}><Icon name="trash-can-outline" size={18} color={colors.error} /></TouchableOpacity>
              </View>
            }
          />
        )}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="account-off-outline" text={t('admin.admins.empty')} />}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      />
      <Fab onPress={openCreate} />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{editId ? t('admin.admins.editTitle') : t('admin.admins.addTitle')}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <FormInput label={t('admin.admins.nameLabel')} value={f.name} onChangeText={set('name')} error={errors.name} />
              {!editId && (
                <FormInput label={t('admin.admins.emailLabel')} value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
              )}
              <FormInput label={editId ? t('admin.admins.newPasswordLabel') : t('admin.admins.passwordLabel')} value={f.password} onChangeText={set('password')} autoCapitalize="none" error={errors.password} />
              <FormInput label={t('admin.admins.mobileLabel')} value={f.mobile} onChangeText={set('mobile')} keyboardType="numeric" prefix="+91" />
              <FormInput label={t('admin.admins.phoneLabel')} value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.fieldLabel}>{t('admin.common.active')}</Text>
                <View style={styles.toggleRow}>
                  {[{ label: t('admin.common.yes'), v: true }, { label: t('admin.common.no'), v: false }].map((o) => (
                    <TouchableOpacity
                      key={o.label}
                      onPress={() => setF((p) => ({ ...p, isActive: o.v }))}
                      style={[styles.toggle, f.isActive === o.v && { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.toggleText, f.isActive === o.v && { color: '#FFFFFF' }]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.sectionHead}>
                <Icon name="map-marker-radius" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t('admin.admins.serviceAreaSection')}</Text>
              </View>
              <Text style={styles.sectionHint}>{t('admin.admins.serviceAreaHint')}</Text>
              <TouchableOpacity style={styles.locBtn} onPress={detectLocation} disabled={locating}>
                <Icon name="crosshairs-gps" size={16} color={colors.primary} />
                <Text style={styles.locBtnText}>{locating ? t('admin.admins.gettingLocation') : t('admin.admins.useMyLocation')}</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><FormInput label={t('admin.admins.latitude')} value={f.latitude} onChangeText={set('latitude')} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><FormInput label={t('admin.admins.longitude')} value={f.longitude} onChangeText={set('longitude')} keyboardType="numeric" /></View>
              </View>
              <FormInput label={t('admin.admins.serviceRadius')} value={f.serviceRadiusKm} onChangeText={set('serviceRadiusKm')} keyboardType="numeric" />
              <FormInput label={t('admin.admins.pincodesServed')} value={f.pincodes} onChangeText={set('pincodes')} placeholder="452001, 452010" />
              <FormInput label={t('admin.admins.serviceAreasText')} value={f.serviceAreas} onChangeText={set('serviceAreas')} placeholder="Limbodi, Bhawarkua" />

              {masterAreas.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.fieldLabel}>{t('admin.admins.serviceAreasMaster')}</Text>
                  <View style={{ marginTop: 6 }}>
                    {masterAreas.map((a) => {
                      const checked = areaIds.includes(a.id);
                      return (
                        <TouchableOpacity key={a.id} style={styles.pickRow} onPress={() => toggleArea(a.id)}>
                          <Icon name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={checked ? colors.primary : colors.textMuted} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pickName}>{a.name}</Text>
                            {!!(a.city || a.pincode) && <Text style={styles.muted}>{[a.city, a.pincode].filter(Boolean).join(' · ')}</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
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
    sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28, maxHeight: '90%' },
    title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
    fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
    toggleRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    toggle: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', backgroundColor: colors.card },
    toggleText: { color: colors.textMuted, fontWeight: '800' },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 2 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.primary },
    sectionHint: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 8 },
    locBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 10 },
    locBtnText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
    pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    pickName: { fontSize: 15, fontWeight: '700', color: colors.text },
    muted: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  });
