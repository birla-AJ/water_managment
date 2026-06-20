import React, { useCallback, useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { adminDriverApi, adminCustomerApi } from '../api';
import type { Customer, Driver } from '../types';
import { PageHeader, Field, StatusChip, Loader } from '../components/ui';
import type { AdminStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'DriverDetails'>;

export default function DriverDetailsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<AdminStackParamList, 'DriverDetails'>>();
  const id = params.id;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  const [assignOpen, setAssignOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<Customer[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');

  const load = useCallback(async () => {
    try { setDriver(await adminDriverApi.get(id)); }
    catch (e) { Alert.alert('Error', errorMessage(e)); } finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loadCandidates = useCallback(async (q: string) => {
    try { const r = await adminCustomerApi.list({ search: q, limit: 50 }); setCandidates(r.data ?? []); } catch { /* ignore */ }
  }, []);

  const openAssign = () => { setPicked({}); setSearch(''); setAssignOpen(true); loadCandidates(''); };

  const confirmAssign = async () => {
    const ids = Object.keys(picked).filter((k) => picked[k]);
    if (!ids.length) return;
    try { await adminDriverApi.assignCustomers(id, ids); setAssignOpen(false); load(); }
    catch (e) { Alert.alert('Error', errorMessage(e)); }
  };

  const unassign = (customerId: string, name: string) => {
    Alert.alert('Remove customer', `Unassign ${name} from this driver?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await adminDriverApi.unassignCustomer(id, customerId); load(); } catch (e) { Alert.alert('Error', errorMessage(e)); }
      } },
    ]);
  };

  const sendNote = async () => {
    if (!noteTitle.trim() || !noteBody.trim()) { Alert.alert('Required', 'Title and message are required.'); return; }
    try { await adminDriverApi.notify(id, noteTitle, noteBody); setNotifyOpen(false); setNoteTitle(''); setNoteBody(''); Alert.alert('Sent', 'Notification sent to driver.'); }
    catch (e) { Alert.alert('Error', errorMessage(e)); }
  };

  if (loading || !driver) return <Loader />;
  const assignedIds = new Set((driver.customers ?? []).map((c) => c.id));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <PageHeader
        title={driver.name}
        subtitle={`Driver · ${driver.mobile}`}
        action={
          <TouchableOpacity onPress={() => navigation.navigate('DriverForm', { id })} style={styles.iconBtn}>
            <Icon name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <View style={styles.fieldInline}><Text style={styles.fieldLabel}>Status</Text><StatusChip status={driver.status} /></View>
        <Field label="Zone" value={driver.zone} />
        <Field label="Vehicle" value={driver.vehicle ? `${driver.vehicle.number}${driver.vehicle.type ? ` (${driver.vehicle.type})` : ''}` : '—'} />
        <Field label="License" value={driver.licenseNumber} />
        <Field label="Email" value={driver.email} />
        <Field label="Assigned customers" value={driver._count?.customers ?? driver.customers?.length ?? 0} />
      </View>

      <View style={styles.rowBtns}>
        <View style={{ flex: 1 }}><PrimaryButton title="Notify" variant="outline" onPress={() => setNotifyOpen(true)} /></View>
        <View style={{ flex: 1 }}><PrimaryButton title="Assign" onPress={openAssign} /></View>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>Assigned Customers</Text>
        {(driver.customers ?? []).length === 0 ? (
          <Text style={styles.muted}>No customers assigned yet.</Text>
        ) : (driver.customers ?? []).map((c) => (
          <View key={c.id} style={styles.assignedRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.assignedName}>{c.name}{c.isPaused ? '  ⏸' : ''}</Text>
              <Text style={styles.muted}>{c.mobile}{c.area ? ` · ${c.area}` : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => unassign(c.id, c.name)} hitSlop={8}>
              <Icon name="trash-can-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Assign modal */}
      <Modal visible={assignOpen} animationType="slide" transparent onRequestClose={() => setAssignOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.cardTitle}>Assign customers</Text>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search name / mobile / area"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={(t) => { setSearch(t); loadCandidates(t); }}
            />
            <FlatList
              data={candidates}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => {
                const already = assignedIds.has(item.id);
                const checked = already || !!picked[item.id];
                return (
                  <TouchableOpacity
                    disabled={already}
                    style={[styles.pickRow, already && { opacity: 0.45 }]}
                    onPress={() => setPicked((p) => ({ ...p, [item.id]: !p[item.id] }))}
                  >
                    <Icon name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={checked ? colors.primary : colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.assignedName}>{item.name}</Text>
                      <Text style={styles.muted}>{item.mobile}{item.area ? ` · ${item.area}` : ''}{already ? ' · already assigned' : ''}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.muted}>No customers found.</Text>}
            />
            <View style={styles.rowBtns}>
              <View style={{ flex: 1 }}><PrimaryButton title="Cancel" variant="outline" onPress={() => setAssignOpen(false)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title="Assign" onPress={confirmAssign} /></View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notify modal */}
      <Modal visible={notifyOpen} animationType="slide" transparent onRequestClose={() => setNotifyOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.cardTitle}>Send notification</Text>
            <TextInput style={styles.modalSearch} placeholder="Title" placeholderTextColor={colors.textMuted} value={noteTitle} onChangeText={setNoteTitle} />
            <TextInput
              style={[styles.modalSearch, { height: 90, textAlignVertical: 'top' }]}
              placeholder="Message" placeholderTextColor={colors.textMuted} multiline value={noteBody} onChangeText={setNoteBody}
            />
            <View style={styles.rowBtns}>
              <View style={{ flex: 1 }}><PrimaryButton title="Cancel" variant="outline" onPress={() => setNotifyOpen(false)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title="Send" onPress={sendNote} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '22' },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
    fieldInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
    muted: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    rowBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
    assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    assignedName: { fontSize: 15, fontWeight: '700', color: colors.text },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
    modalSearch: {
      backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder,
      paddingHorizontal: 14, paddingVertical: 12, color: colors.text, marginBottom: 10,
    },
    pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  });
