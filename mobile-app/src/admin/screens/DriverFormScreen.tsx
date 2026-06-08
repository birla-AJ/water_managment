import React, { useEffect, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { adminDriverApi, adminVehicleApi } from '../api';
import type { DriverStatus, Vehicle } from '../types';
import { PageHeader, FormInput, Segmented, FilterChips, FieldLabel, Loader } from '../components/ui';
import type { AdminStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'DriverForm'>;

export default function DriverFormScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<AdminStackParamList, 'DriverForm'>>();
  const id = params?.id;
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicleOptions, setVehicleOptions] = useState<{ label: string; value: string }[]>([{ label: 'None', value: '' }]);
  const [f, setF] = useState({
    name: '', mobile: '', altMobile: '', email: '', licenseNumber: '', zone: '', address: '',
    status: 'ACTIVE' as DriverStatus, vehicleId: '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const [available, driver] = await Promise.all([
          adminVehicleApi.available().catch(() => [] as Vehicle[]),
          isEdit ? adminDriverApi.get(id!) : Promise.resolve(null),
        ]);
        const opts = [{ label: 'None', value: '' }];
        const seen = new Set<string>();
        if (driver?.vehicle) { opts.push({ label: driver.vehicle.number, value: driver.vehicle.id }); seen.add(driver.vehicle.id); }
        available.forEach((v) => { if (!seen.has(v.id)) opts.push({ label: v.number, value: v.id }); });
        setVehicleOptions(opts);
        if (driver) {
          setF({
            name: driver.name ?? '', mobile: driver.mobile ?? '', altMobile: driver.altMobile ?? '',
            email: driver.email ?? '', licenseNumber: driver.licenseNumber ?? '', zone: driver.zone ?? '',
            address: driver.address ?? '', status: driver.status, vehicleId: driver.vehicle?.id ?? driver.vehicleId ?? '',
          });
        }
      } catch (e) { Alert.alert('Error', errorMessage(e)); } finally { setLoading(false); }
    })();
  }, [id, isEdit]);

  const submit = async () => {
    if (!f.name.trim() || !f.mobile.trim()) { Alert.alert('Required', 'Name and mobile are required.'); return; }
    setSaving(true);
    const payload = {
      name: f.name, mobile: f.mobile, altMobile: f.altMobile || undefined, email: f.email || undefined,
      licenseNumber: f.licenseNumber || undefined, zone: f.zone || undefined, address: f.address || undefined,
      status: f.status, vehicleId: f.vehicleId || null,
    };
    try {
      if (isEdit) await adminDriverApi.update(id!, payload);
      else await adminDriverApi.create(payload);
      navigation.goBack();
    } catch (e) { Alert.alert('Error', errorMessage(e)); } finally { setSaving(false); }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <PageHeader title={isEdit ? 'Edit Driver' : 'Add Driver'} subtitle="Driver logs in with this mobile + OTP" />
      <FormInput label="Name *" value={f.name} onChangeText={set('name')} autoCapitalize="words" />
      <FormInput label="Mobile (login number) *" value={f.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" />
      <FormInput label="Alternate Mobile" value={f.altMobile} onChangeText={set('altMobile')} keyboardType="phone-pad" />
      <FormInput label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      <FormInput label="License Number" value={f.licenseNumber} onChangeText={set('licenseNumber')} />
      <FormInput label="Zone" value={f.zone} onChangeText={set('zone')} placeholder="e.g. Kothrud" />
      <FormInput label="Address" value={f.address} onChangeText={set('address')} multiline />
      <Segmented
        label="Status"
        options={[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }]}
        value={f.status}
        onChange={(v) => setF((p) => ({ ...p, status: v }))}
      />
      <View style={{ marginBottom: 14 }}>
        <FieldLabel>Vehicle</FieldLabel>
        <FilterChips options={vehicleOptions} value={f.vehicleId} onChange={(v) => setF((p) => ({ ...p, vehicleId: v }))} />
      </View>
      <PrimaryButton title={isEdit ? 'Update Driver' : 'Create Driver'} onPress={submit} loading={saving} />
      <View style={{ height: 10 }} />
      <PrimaryButton title="Cancel" variant="outline" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}
