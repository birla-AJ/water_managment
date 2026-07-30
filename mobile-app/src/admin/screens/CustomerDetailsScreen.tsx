import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
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

export default function CustomerDetailsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<AdminStackParamList, 'CustomerDetails'>>();
  const id = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [schedules, setSchedules] = useState<Partial<CustomerSchedule>[]>([]);
  const [waterDays, setWaterDays] = useState<string[]>([]);
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([
        adminCustomerApi.get(id),
        adminCustomerApi.deliveryDates(id).catch(() => [] as string[]),
      ]);
      setCustomer(c);
      setSchedules(c.schedules ?? []);
      setWaterDays(s);
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setLoading(false); }
  }, [id, t]);

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
      Alert.alert(t('admin.customerDetails.saved'), t('admin.customerDetails.scheduleUpdated'));
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
  };

  const togglePause = async () => {
    if (!customer) return;
    try {
      if (customer.isPaused) await adminCustomerApi.resume(id);
      else await adminCustomerApi.pause(id);
      load();
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
  };

  const addWaterDay = () => {
    const d = newDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { Alert.alert(t('admin.customerDetails.invalidDate'), t('admin.customerDetails.invalidDateMsg')); return; }
    if (!waterDays.includes(d)) setWaterDays([...waterDays, d].sort());
    setNewDate('');
  };
  const saveWaterDays = async () => {
    try { const r = await adminCustomerApi.setDeliveryDates(id, waterDays); setWaterDays(r); Alert.alert(t('admin.customerDetails.saved'), t('admin.customerDetails.waterDaysUpdated')); }
    catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
  };

  const removeCustomer = () => {
    if (!customer) return;
    Alert.alert(
      t('admin.customerDetails.removeTitle'),
      t('admin.customerDetails.removeMsg', { name: customer.name }),
      [
        { text: t('admin.common.cancel'), style: 'cancel' },
        {
          text: t('admin.common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await adminCustomerApi.remove(id);
              navigation.goBack();
            } catch (e) {
              Alert.alert(t('admin.common.error'), errorMessage(e));
            }
          },
        },
      ],
    );
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
        <Text style={styles.cardTitle}>{t('admin.customerDetails.profile')}</Text>
        <View style={styles.fieldInline}><Text style={styles.fieldLabel}>{t('admin.customerDetails.status')}</Text><StatusChip status={customer.status} /></View>
        <Field label={t('admin.customerDetails.type')} value={customer.customerType} />
        <Field label={t('admin.customerDetails.area')} value={customer.area} />
        <Field label={t('admin.customerDetails.address')} value={customer.address} />
        <Field label={t('admin.customerDetails.landmark')} value={customer.landmark} />
        <Field label={t('admin.customerDetails.ratePerCamper')} value={`₹${customer.ratePerCamper}`} />
        <Field label={t('admin.customerDetails.securityDeposit')} value={`₹${customer.securityDeposit}`} />
        <Field label={t('admin.customerDetails.allocatedCampers')} value={customer.allocatedCampers} />
        <Field label={t('admin.customerDetails.paused')} value={customer.isPaused ? t('admin.common.yes') : t('admin.common.no')} />
      </View>

      <PrimaryButton
        title={customer.isPaused ? t('admin.customerDetails.resumeDeliveries') : t('admin.customerDetails.pauseDeliveries')}
        variant={customer.isPaused ? 'primary' : 'outline'}
        onPress={togglePause}
      />

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>{t('admin.customerDetails.deliverySchedule')}</Text>
        <Text style={styles.cardSub}>{t('admin.customerDetails.scheduleHint')}</Text>
        {DAYS.map((d) => {
          const day = getDay(d);
          return (
            <View key={d} style={styles.dayRow}>
              <Switch
                value={!!day.enabled}
                onValueChange={(v) => updateDay(d, { enabled: v })}
                trackColor={{ true: colors.primary }}
              />
              <Text style={styles.dayLabel}>{t(`admin.customerDetails.weekdays.${d}`)}</Text>
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
        <PrimaryButton title={t('admin.customerDetails.saveSchedule')} onPress={saveSchedule} />
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>{t('admin.customerDetails.waterDays')}</Text>
        <Text style={styles.cardSub}>{t('admin.customerDetails.waterDaysHint')}</Text>
        <View style={styles.dayAddRow}>
          <TextInput
            style={styles.dayInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            value={newDate}
            onChangeText={setNewDate}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addWaterDay}><Text style={styles.addBtnText}>{t('admin.common.add')}</Text></TouchableOpacity>
        </View>
        <View style={styles.dayChips}>
          {waterDays.length ? waterDays.map((d) => (
            <TouchableOpacity key={d} style={styles.dayChip} onPress={() => setWaterDays(waterDays.filter((x) => x !== d))}>
              <Text style={styles.dayChipText}>{d}</Text>
              <Icon name="close" size={14} color={colors.success} />
            </TouchableOpacity>
          )) : <Text style={styles.cardSub}>{t('admin.customerDetails.noWaterDays')}</Text>}
        </View>
        <View style={{ height: 12 }} />
        <PrimaryButton title={t('admin.customerDetails.saveWaterDays')} onPress={saveWaterDays} />
      </View>

      <View style={{ height: 20 }} />
      <PrimaryButton title={t('admin.customerDetails.removeCustomer')} variant="outline" onPress={removeCustomer} />
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
      width: 70, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder,
      paddingHorizontal: 12, paddingVertical: 8, color: colors.text, textAlign: 'center',
    },
    dayAddRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    dayInput: {
      flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder,
      paddingHorizontal: 12, paddingVertical: 10, color: colors.text,
    },
    addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: '#FFFFFF', fontWeight: '800' },
    dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    dayChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 16, borderWidth: 1, borderColor: colors.success + '55', backgroundColor: colors.success + '1F',
    },
    dayChipText: { color: colors.success, fontWeight: '700', fontSize: 13 },
  });
