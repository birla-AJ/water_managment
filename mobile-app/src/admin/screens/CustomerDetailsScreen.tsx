import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { adminCustomerApi } from '../api';
import type { Customer, CustomerSchedule, Weekday } from '../types';
import { PageHeader, Field, StatusChip, Loader } from '../components/ui';
import type { AdminStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'CustomerDetails'>;
const DAYS: Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const cap = (d: string) => d.charAt(0) + d.slice(1).toLowerCase();

export default function CustomerDetailsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<AdminStackParamList, 'CustomerDetails'>>();
  const id = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [schedules, setSchedules] = useState<Partial<CustomerSchedule>[]>([]);
  const [skips, setSkips] = useState<string[]>([]);
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([
        adminCustomerApi.get(id),
        adminCustomerApi.skipDates(id).catch(() => [] as string[]),
      ]);
      setCustomer(c);
      setSchedules(c.schedules ?? []);
      setSkips(s);
    } catch (e) { Alert.alert('Error', errorMessage(e)); } finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const getDay = (d: Weekday) => schedules.find((s) => s.weekday === d) ?? { weekday: d, enabled: false, quantity: 1 };
  const updateDay = (d: Weekday, patch: Partial<CustomerSchedule>) =>
    setSchedules((prev) => {
      const exists = prev.find((s) => s.weekday === d);
      if (exists) return prev.map((s) => (s.weekday === d ? { ...s, ...patch } : s));
      return [...prev, { weekday: d, enabled: false, quantity: 1, ...patch }];
    });

  const saveSchedule = async () => {
    try {
      await adminCustomerApi.updateSchedules(id, DAYS.map((d) => {
        const day = getDay(d);
        return { weekday: d, enabled: !!day.enabled, quantity: day.quantity ?? 1 };
      }));
      Alert.alert('Saved', 'Delivery schedule updated.');
    } catch (e) { Alert.alert('Error', errorMessage(e)); }
  };

  const togglePause = async () => {
    if (!customer) return;
    try {
      if (customer.isPaused) await adminCustomerApi.resume(id);
      else await adminCustomerApi.pause(id);
      load();
    } catch (e) { Alert.alert('Error', errorMessage(e)); }
  };

  const addSkip = () => {
    const d = newDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { Alert.alert('Invalid date', 'Use the format YYYY-MM-DD.'); return; }
    if (!skips.includes(d)) setSkips([...skips, d].sort());
    setNewDate('');
  };
  const saveSkips = async () => {
    try { const r = await adminCustomerApi.setSkipDates(id, skips); setSkips(r); Alert.alert('Saved', 'Unavailable days updated.'); }
    catch (e) { Alert.alert('Error', errorMessage(e)); }
  };

  if (loading || !customer) return <Loader />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <PageHeader
        title={customer.name}
        subtitle={customer.mobile}
        action={
          <TouchableOpacity onPress={() => navigation.navigate('CustomerForm', { id })} style={styles.editBtn}>
            <Icon name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <View style={styles.fieldInline}><Text style={styles.fieldLabel}>Status</Text><StatusChip status={customer.status} /></View>
        <Field label="Type" value={customer.customerType} />
        <Field label="Area" value={customer.area} />
        <Field label="Address" value={customer.address} />
        <Field label="Landmark" value={customer.landmark} />
        <Field label="Rate / Camper" value={`₹${customer.ratePerCamper}`} />
        <Field label="Security Deposit" value={`₹${customer.securityDeposit}`} />
        <Field label="Allocated Campers" value={customer.allocatedCampers} />
        <Field label="Paused" value={customer.isPaused ? 'Yes' : 'No'} />
      </View>

      <PrimaryButton
        title={customer.isPaused ? 'Resume Deliveries' : 'Pause Deliveries'}
        variant={customer.isPaused ? 'primary' : 'outline'}
        onPress={togglePause}
      />

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>Delivery Schedule</Text>
        <Text style={styles.cardSub}>Enable delivery and set quantity per weekday.</Text>
        {DAYS.map((d) => {
          const day = getDay(d);
          return (
            <View key={d} style={styles.dayRow}>
              <Switch
                value={!!day.enabled}
                onValueChange={(v) => updateDay(d, { enabled: v })}
                trackColor={{ true: colors.primary }}
              />
              <Text style={styles.dayLabel}>{cap(d)}</Text>
              <TextInput
                style={styles.qtyInput}
                keyboardType="numeric"
                editable={!!day.enabled}
                value={String(day.quantity ?? 1)}
                onChangeText={(t) => updateDay(d, { quantity: Number(t) || 0 })}
              />
            </View>
          );
        })}
        <View style={{ height: 12 }} />
        <PrimaryButton title="Save Schedule" onPress={saveSchedule} />
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>Unavailable Days (Skips)</Text>
        <Text style={styles.cardSub}>No delivery is generated on these dates.</Text>
        <View style={styles.skipAddRow}>
          <TextInput
            style={styles.skipInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            value={newDate}
            onChangeText={setNewDate}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addSkip}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
        </View>
        <View style={styles.skipChips}>
          {skips.length ? skips.map((d) => (
            <TouchableOpacity key={d} style={styles.skipChip} onPress={() => setSkips(skips.filter((x) => x !== d))}>
              <Text style={styles.skipChipText}>{d}</Text>
              <Icon name="close" size={14} color={colors.warning} />
            </TouchableOpacity>
          )) : <Text style={styles.cardSub}>No upcoming skipped days.</Text>}
        </View>
        <View style={{ height: 12 }} />
        <PrimaryButton title="Save Unavailable Days" onPress={saveSkips} />
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    editBtn: {
      width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primary + '22',
    },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
    cardSub: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginBottom: 6 },
    fieldInline: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
    dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    dayLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '700' },
    qtyInput: {
      width: 70, backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder,
      paddingHorizontal: 12, paddingVertical: 8, color: colors.text, textAlign: 'center',
    },
    skipAddRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    skipInput: {
      flex: 1, backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder,
      paddingHorizontal: 12, paddingVertical: 10, color: colors.text,
    },
    addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: '#FFFFFF', fontWeight: '800' },
    skipChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    skipChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 16, borderWidth: 1, borderColor: colors.warning + '55', backgroundColor: colors.warning + '1F',
    },
    skipChipText: { color: colors.warning, fontWeight: '700', fontSize: 13 },
  });
