import React, { useEffect, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { adminCustomerApi } from '../api';
import type { CustomerType, CustomerStatus } from '../types';
import { PageHeader, FormInput, Segmented, Loader } from '../components/ui';
import type { AdminStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'CustomerForm'>;

export default function CustomerFormScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<AdminStackParamList, 'CustomerForm'>>();
  const id = params?.id;
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: '', mobile: '', altMobile: '', email: '', address: '', area: '', landmark: '',
    customerType: 'DAILY' as CustomerType, status: 'ACTIVE' as CustomerStatus,
    securityDeposit: '0', ratePerCamper: '30', allocatedCampers: '1', notes: '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const c = await adminCustomerApi.get(id!);
        setF({
          name: c.name ?? '', mobile: c.mobile ?? '', altMobile: c.altMobile ?? '', email: c.email ?? '',
          address: c.address ?? '', area: c.area ?? '', landmark: c.landmark ?? '',
          customerType: c.customerType, status: c.status,
          securityDeposit: String(c.securityDeposit ?? 0), ratePerCamper: String(c.ratePerCamper ?? 0),
          allocatedCampers: String(c.allocatedCampers ?? 0), notes: c.notes ?? '',
        });
      } catch (e) { Alert.alert('Error', errorMessage(e)); } finally { setLoading(false); }
    })();
  }, [id, isEdit]);

  const submit = async () => {
    if (!f.name.trim() || !f.mobile.trim()) { Alert.alert('Required', 'Name and mobile are required.'); return; }
    setSaving(true);
    const payload = {
      name: f.name, mobile: f.mobile, altMobile: f.altMobile || undefined, email: f.email || undefined,
      address: f.address || undefined, area: f.area || undefined, landmark: f.landmark || undefined,
      customerType: f.customerType, status: f.status, notes: f.notes || undefined,
      securityDeposit: Number(f.securityDeposit) || 0,
      ratePerCamper: Number(f.ratePerCamper) || 0,
      allocatedCampers: Number(f.allocatedCampers) || 0,
    };
    try {
      if (isEdit) await adminCustomerApi.update(id!, payload);
      else await adminCustomerApi.create(payload);
      navigation.goBack();
    } catch (e) { Alert.alert('Error', errorMessage(e)); } finally { setSaving(false); }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <PageHeader title={isEdit ? 'Edit Customer' : 'Add Customer'} />
      <FormInput label="Name *" value={f.name} onChangeText={set('name')} placeholder="Full name" autoCapitalize="words" />
      <FormInput label="Mobile *" value={f.mobile} onChangeText={set('mobile')} placeholder="10-digit mobile" keyboardType="phone-pad" />
      <FormInput label="Alternate Mobile" value={f.altMobile} onChangeText={set('altMobile')} keyboardType="phone-pad" />
      <FormInput label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      <FormInput label="Address" value={f.address} onChangeText={set('address')} multiline />
      <FormInput label="Area" value={f.area} onChangeText={set('area')} />
      <FormInput label="Landmark" value={f.landmark} onChangeText={set('landmark')} />
      <Segmented
        label="Customer Type"
        options={[{ label: 'Daily', value: 'DAILY' }, { label: 'Weekly', value: 'WEEKLY' }, { label: 'Monthly', value: 'MONTHLY' }]}
        value={f.customerType}
        onChange={(v) => setF((p) => ({ ...p, customerType: v }))}
      />
      <Segmented
        label="Status"
        options={[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }]}
        value={f.status}
        onChange={(v) => setF((p) => ({ ...p, status: v }))}
      />
      <FormInput label="Security Deposit (₹)" value={f.securityDeposit} onChangeText={set('securityDeposit')} keyboardType="numeric" />
      <FormInput label="Rate / Camper (₹)" value={f.ratePerCamper} onChangeText={set('ratePerCamper')} keyboardType="numeric" />
      <FormInput label="Allocated Campers" value={f.allocatedCampers} onChangeText={set('allocatedCampers')} keyboardType="numeric" />
      <FormInput label="Notes" value={f.notes} onChangeText={set('notes')} multiline />
      <View style={{ height: 8 }} />
      <PrimaryButton title={isEdit ? 'Update Customer' : 'Create Customer'} onPress={submit} loading={saving} />
      <View style={{ height: 10 }} />
      <PrimaryButton title="Cancel" variant="outline" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}
