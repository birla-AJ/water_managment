import React, { useCallback, useState } from 'react';
import { View, FlatList, Modal, StyleSheet, Text, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { adminVehicleApi } from '../api';
import type { Vehicle } from '../types';
import { PageHeader, RowCard, StatusChip, Fab, Loader, EmptyState, FormInput, Segmented } from '../components/ui';

export default function VehiclesScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ number: '', type: '', capacity: '', isActive: 'true', notes: '' });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    try { const r = await adminVehicleApi.list({ page: 1, limit: 100 }); setItems(r.data ?? []); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openCreate = () => { setEditId(null); setF({ number: '', type: '', capacity: '', isActive: 'true', notes: '' }); setOpen(true); };
  const openEdit = (v: Vehicle) => {
    setEditId(v.id);
    setF({ number: v.number ?? '', type: v.type ?? '', capacity: v.capacity ? String(v.capacity) : '', isActive: v.isActive ? 'true' : 'false', notes: v.notes ?? '' });
    setOpen(true);
  };

  const save = async () => {
    if (!f.number.trim()) { Alert.alert('Required', 'Vehicle number is required.'); return; }
    setSaving(true);
    const payload = { number: f.number, type: f.type || undefined, capacity: f.capacity ? Number(f.capacity) : undefined, isActive: f.isActive === 'true', notes: f.notes || undefined };
    try {
      if (editId) await adminVehicleApi.update(editId, payload);
      else await adminVehicleApi.create(payload);
      setOpen(false); load();
    } catch (e) { Alert.alert('Error', errorMessage(e)); } finally { setSaving(false); }
  };

  const del = (v: Vehicle) => {
    Alert.alert('Delete vehicle', `Delete ${v.number}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await adminVehicleApi.remove(v.id); load(); } catch (e) { Alert.alert('Error', errorMessage(e)); }
      } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={<PageHeader title="Vehicles" subtitle="Delivery vehicles to assign to drivers" />}
        renderItem={({ item }) => (
          <RowCard
            leftIcon="car"
            leftColor="#0FB8C0"
            title={item.number}
            subtitle={`${item.type ?? 'Vehicle'}${item.capacity ? ` · ${item.capacity} cap` : ''}`}
            meta={item.driver ? `Assigned to ${item.driver.name}` : 'Unassigned'}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <StatusChip status={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
                <TouchableOpacity onPress={() => openEdit(item)} hitSlop={6}><Icon name="pencil" size={18} color={colors.primary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => del(item)} hitSlop={6}><Icon name="trash-can-outline" size={18} color={colors.error} /></TouchableOpacity>
              </View>
            }
          />
        )}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="car-off" text="No vehicles yet" />}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      />
      <Fab onPress={openCreate} />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{editId ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
            <FormInput label="Vehicle Number *" value={f.number} onChangeText={set('number')} autoCapitalize="characters" />
            <FormInput label="Type" value={f.type} onChangeText={set('type')} placeholder="Tempo, Van…" />
            <FormInput label="Capacity (campers)" value={f.capacity} onChangeText={set('capacity')} keyboardType="numeric" />
            <Segmented label="Active" options={[{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }]} value={f.isActive} onChange={(v) => setF((p) => ({ ...p, isActive: v }))} />
            <FormInput label="Notes" value={f.notes} onChangeText={set('notes')} multiline />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <View style={{ flex: 1 }}><PrimaryButton title="Cancel" variant="outline" onPress={() => setOpen(false)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title={editId ? 'Update' : 'Create'} onPress={save} loading={saving} /></View>
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
    sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
  });
