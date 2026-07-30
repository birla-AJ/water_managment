import React, { useCallback, useState } from 'react';
import { View, FlatList, Modal, ScrollView, StyleSheet, Text, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { adminDriverApi, adminVehicleApi } from '../api';
import type { Driver, DriverStatus, Vehicle } from '../types';
import { PageHeader, FilterChips, Fab, Loader, EmptyState, FormInput } from '../components/ui';
import type { AdminStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'Drivers'>;

export default function DriversScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();

  const STATUS_FILTERS: { label: string; value: '' | DriverStatus }[] = [
    { label: t('admin.common.all'), value: '' },
    { label: t('admin.common.active'), value: 'ACTIVE' },
    { label: t('admin.common.inactive'), value: 'INACTIVE' },
  ];

  const [items, setItems] = useState<Driver[]>([]);
  const [available, setAvailable] = useState<Vehicle[]>([]);
  const [status, setStatus] = useState<'' | DriverStatus>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Vehicle-assignment picker (which driver's dropdown is open)
  const [vehicleFor, setVehicleFor] = useState<Driver | null>(null);

  // Add-vehicle dialog
  const [vehOpen, setVehOpen] = useState(false);
  const [vehSaving, setVehSaving] = useState(false);
  const [veh, setVeh] = useState({ number: '', type: '', capacity: '' });
  const [vehError, setVehError] = useState('');

  const load = useCallback(async () => {
    try {
      const [res, av] = await Promise.all([
        adminDriverApi.list({ status: status || undefined, page: 1, limit: 100 }),
        adminVehicleApi.available().catch(() => []),
      ]);
      setItems(res.data ?? []);
      setAvailable(av);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Options for a given driver = its current vehicle + all unassigned vehicles.
  const vehicleOptions = (d: Driver | null): Vehicle[] => {
    if (!d) return available;
    const current = d.vehicle ? [d.vehicle as Vehicle] : [];
    return [...current, ...available.filter((v) => v.id !== d.vehicle?.id)];
  };

  const assignVehicle = async (driver: Driver, vehicleId: string | null) => {
    setVehicleFor(null);
    if (vehicleId === (driver.vehicle?.id ?? null)) return;
    setBusyId(driver.id);
    try { await adminDriverApi.assignVehicle(driver.id, vehicleId); await load(); }
    catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setBusyId(null); }
  };

  const toggleStatus = async (driver: Driver) => {
    const next: DriverStatus = driver.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setBusyId(driver.id);
    try { await adminDriverApi.update(driver.id, { status: next }); await load(); }
    catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setBusyId(null); }
  };

  const saveVehicle = async () => {
    if (!veh.number.trim()) { setVehError(t('admin.drivers.vehicleNumberRequired')); return; }
    setVehSaving(true);
    try {
      await adminVehicleApi.create({
        number: veh.number.trim(),
        type: veh.type.trim() || undefined,
        capacity: veh.capacity ? Number(veh.capacity) : undefined,
        isActive: true,
      });
      setVehOpen(false); setVeh({ number: '', type: '', capacity: '' }); setVehError('');
      await load();
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setVehSaving(false); }
  };

  const renderDriver = ({ item }: { item: Driver }) => {
    const disabled = busyId === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.icon, { backgroundColor: '#0E838822' }]}><Icon name="truck" size={20} color="#0E8388" /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {item.mobile}{item.zone ? ` · ${item.zone}` : ''} · {t('admin.drivers.customerCount', { n: item._count?.customers ?? item.customers?.length ?? 0 })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('DriverDetails', { id: item.id })} hitSlop={6} style={styles.actionIcon}>
            <Icon name="eye" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('DriverForm', { id: item.id })} hitSlop={6} style={styles.actionIcon}>
            <Icon name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Vehicle assignment */}
        <Text style={styles.label}>{t('admin.drivers.vehicleAssignment')}</Text>
        <TouchableOpacity style={styles.dropdown} activeOpacity={0.7} disabled={disabled} onPress={() => setVehicleFor(item)}>
          <Icon name="car" size={16} color={colors.textMuted} />
          <Text style={[styles.dropdownText, !item.vehicle && { color: colors.textMuted, fontStyle: 'italic' }]}>
            {item.vehicle?.number ?? t('admin.drivers.unassigned')}
          </Text>
          <Icon name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Duty + account status */}
        <View style={styles.statusRow}>
          <View style={[styles.dutyChip, { backgroundColor: item.isOnDuty ? colors.success + '22' : colors.textMuted + '18', borderColor: item.isOnDuty ? colors.success + '55' : colors.border }]}>
            <Icon name={item.isOnDuty ? 'steering' : 'steering-off'} size={13} color={item.isOnDuty ? colors.success : colors.textMuted} />
            <Text style={[styles.dutyText, { color: item.isOnDuty ? colors.success : colors.textMuted }]}>{item.isOnDuty ? t('admin.drivers.onDuty') : t('admin.drivers.offDuty')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.acctChip, { backgroundColor: (item.status === 'ACTIVE' ? colors.success : colors.error) + '18', borderColor: (item.status === 'ACTIVE' ? colors.success : colors.error) + '55' }]}
            activeOpacity={0.7}
            disabled={disabled}
            onPress={() => toggleStatus(item)}
          >
            <View style={[styles.dot, { backgroundColor: item.status === 'ACTIVE' ? colors.success : colors.error }]} />
            <Text style={[styles.acctText, { color: item.status === 'ACTIVE' ? colors.success : colors.error }]}>{item.status}</Text>
            <Icon name="swap-horizontal" size={14} color={item.status === 'ACTIVE' ? colors.success : colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={
          <View>
            <PageHeader
              subtitle={t('admin.drivers.subtitle')}
              action={
                <TouchableOpacity style={styles.addVehicleBtn} activeOpacity={0.7} onPress={() => { setVeh({ number: '', type: '', capacity: '' }); setVehError(''); setVehOpen(true); }}>
                  <Icon name="car-outline" size={16} color={colors.primary} />
                  <Text style={styles.addVehicleText}>{t('admin.drivers.vehicleButton')}</Text>
                </TouchableOpacity>
              }
            />
            <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <Text style={styles.hint}>{t('admin.drivers.dropdownHint')}</Text>
          </View>
        }
        renderItem={renderDriver}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="truck-remove" text={t('admin.drivers.noDrivers')} />}
        refreshControl={
          <RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />
        }
      />
      <Fab icon="account-plus" side="left" bottom={20} onPress={() => navigation.navigate('DriverForm', {})} />

      {/* Vehicle assignment picker */}
      <Modal visible={!!vehicleFor} transparent animationType="fade" onRequestClose={() => setVehicleFor(null)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setVehicleFor(null)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>{t('admin.drivers.assignVehicleTo', { name: vehicleFor?.name })}</Text>
            <ScrollView>
              <TouchableOpacity style={styles.pickerRow} onPress={() => vehicleFor && assignVehicle(vehicleFor, null)}>
                <Text style={[styles.pickerText, { fontStyle: 'italic', color: colors.textMuted }]}>{t('admin.drivers.unassigned')}</Text>
                {!vehicleFor?.vehicle && <Icon name="check" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {vehicleOptions(vehicleFor).map((v) => {
                const active = vehicleFor?.vehicle?.id === v.id;
                return (
                  <TouchableOpacity key={v.id} style={styles.pickerRow} onPress={() => vehicleFor && assignVehicle(vehicleFor, v.id)}>
                    <Text style={[styles.pickerText, active && { color: colors.primary, fontWeight: '800' }]}>
                      {v.number}{v.type ? ` · ${v.type}` : ''}
                    </Text>
                    {active && <Icon name="check" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
              {vehicleOptions(vehicleFor).length === 0 && (
                <Text style={styles.emptyPicker}>{t('admin.drivers.noUnassignedVehicles')}</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add vehicle dialog */}
      <Modal visible={vehOpen} animationType="slide" transparent onRequestClose={() => setVehOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('admin.drivers.addVehicle')}</Text>
            <FormInput label={t('admin.drivers.vehicleNumberLabel')} value={veh.number} onChangeText={(val) => { setVeh((p) => ({ ...p, number: val })); setVehError(''); }} autoCapitalize="characters" error={vehError} />
            <FormInput label={t('admin.drivers.type')} value={veh.type} onChangeText={(val) => setVeh((p) => ({ ...p, type: val }))} placeholder={t('admin.drivers.typePlaceholder')} />
            <FormInput label={t('admin.drivers.capacity')} value={veh.capacity} onChangeText={(val) => setVeh((p) => ({ ...p, capacity: val }))} keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <View style={{ flex: 1 }}><PrimaryButton title={t('admin.common.cancel')} variant="outline" onPress={() => setVehOpen(false)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title={t('admin.drivers.addVehicle')} onPress={saveVehicle} loading={vehSaving} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    hint: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 4, marginBottom: 8 },
    card: {
      backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder,
      padding: 14, marginBottom: 10,
      shadowColor: colors.isDark ? '#000' : colors.primary, shadowOpacity: colors.isDark ? 0.35 : 0.1,
      shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 15, fontWeight: '800', color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    actionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '14' },

    label: { fontSize: 11, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 14, marginBottom: 6 },
    dropdown: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.bgElevated, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder,
      paddingHorizontal: 12, paddingVertical: 11,
    },
    dropdownText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '700' },

    statusRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    dutyChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    dutyText: { fontSize: 11.5, fontWeight: '800' },
    acctChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    acctText: { fontSize: 11.5, fontWeight: '800' },
    dot: { width: 7, height: 7, borderRadius: 4 },

    addVehicleBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: colors.primary + '18', borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '44',
      paddingHorizontal: 12, paddingVertical: 9,
    },
    addVehicleText: { color: colors.primary, fontWeight: '800', fontSize: 13 },

    pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28, maxHeight: '70%' },
    pickerTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
    pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    pickerText: { fontSize: 15, color: colors.text, fontWeight: '600' },
    emptyPicker: { fontSize: 13, color: colors.textMuted, fontWeight: '600', paddingVertical: 16, textAlign: 'center' },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
  });
