import React, { useEffect, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { adminDriverApi, adminVehicleApi } from '../api';
import type { DriverStatus, Vehicle } from '../types';
import { PageHeader, FormInput, Segmented, FilterChips, FieldLabel, Loader } from '../components/ui';
import { isMobile, isEmail, sanitizeMobile } from '../validation';
import type { AdminStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'DriverForm'>;

export default function DriverFormScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<AdminStackParamList, 'DriverForm'>>();
  const id = params?.id;
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicleOptions, setVehicleOptions] = useState<{ label: string; value: string }[]>([{ label: t('admin.common.none'), value: '' }]);
  const [f, setF] = useState({
    name: '', mobile: '', altMobile: '', email: '', licenseNumber: '', zone: '', address: '',
    status: 'ACTIVE' as DriverStatus, vehicleId: '',
  });
  const set = (k: keyof typeof f) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = t('admin.driverForm.nameRequired');
    if (!isMobile(f.mobile)) e.mobile = t('admin.driverForm.mobileInvalid');
    if (f.altMobile && !isMobile(f.altMobile)) e.altMobile = t('admin.driverForm.altMobileInvalid');
    if (f.email && !isEmail(f.email)) e.email = t('admin.driverForm.emailInvalid');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    (async () => {
      try {
        const [available, driver] = await Promise.all([
          adminVehicleApi.available().catch(() => [] as Vehicle[]),
          isEdit ? adminDriverApi.get(id!) : Promise.resolve(null),
        ]);
        const opts = [{ label: t('admin.common.none'), value: '' }];
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
      } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setLoading(false); }
    })();
  }, [id, isEdit]);

  const submit = async () => {
    if (!validate()) return;
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
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setSaving(false); }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <PageHeader title={isEdit ? t('admin.driverForm.editTitle') : t('admin.driverForm.addTitle')} subtitle={t('admin.driverForm.subtitle')} />
      <FormInput label={t('admin.driverForm.name')} value={f.name} onChangeText={set('name')} autoCapitalize="words" error={errors.name} />
      <FormInput label={t('admin.driverForm.mobile')} value={f.mobile} onChangeText={(v) => set('mobile')(sanitizeMobile(v))} keyboardType="phone-pad" prefix="+91" error={errors.mobile} />
      <FormInput label={t('admin.driverForm.altMobile')} value={f.altMobile} onChangeText={(v) => set('altMobile')(sanitizeMobile(v))} keyboardType="phone-pad" prefix="+91" error={errors.altMobile} />
      <FormInput label={t('admin.driverForm.email')} value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
      <FormInput label={t('admin.driverForm.licenseNumber')} value={f.licenseNumber} onChangeText={set('licenseNumber')} />
      <FormInput label={t('admin.driverForm.zone')} value={f.zone} onChangeText={set('zone')} placeholder={t('admin.driverForm.zonePlaceholder')} />
      <FormInput label={t('admin.driverForm.address')} value={f.address} onChangeText={set('address')} multiline />
      <Segmented
        label={t('admin.driverForm.status')}
        options={[{ label: t('admin.common.active'), value: 'ACTIVE' }, { label: t('admin.common.inactive'), value: 'INACTIVE' }]}
        value={f.status}
        onChange={(v) => setF((p) => ({ ...p, status: v }))}
      />
      <View style={{ marginBottom: 14 }}>
        <FieldLabel>{t('admin.driverForm.vehicle')}</FieldLabel>
        <FilterChips options={vehicleOptions} value={f.vehicleId} onChange={(v) => setF((p) => ({ ...p, vehicleId: v }))} />
      </View>
      <PrimaryButton title={isEdit ? t('admin.driverForm.updateBtn') : t('admin.driverForm.createBtn')} onPress={submit} loading={saving} />
      <View style={{ height: 10 }} />
      <PrimaryButton title={t('admin.common.cancel')} variant="outline" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}
