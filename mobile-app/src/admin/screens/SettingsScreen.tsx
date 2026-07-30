import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { adminSettingsApi } from '../api';
import { PageHeader, FormInput, Loader } from '../components/ui';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<Record<string, string>>({});
  const [billing, setBilling] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const data = await adminSettingsApi.getAll();
      setBusiness(data?.business ?? {});
      const b = data?.billing ?? {};
      setBilling(Object.fromEntries(Object.entries(b).map(([k, v]) => [k, String(v ?? '')])));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setB = (k: string) => (v: string) => setBusiness((p) => ({ ...p, [k]: v }));
  const setBill = (k: string) => (v: string) => setBilling((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await adminSettingsApi.update('business', business);
      await adminSettingsApi.update('billing', {
        defaultRate: Number(billing.defaultRate) || 0,
        taxPercent: Number(billing.taxPercent) || 0,
        dueDays: Number(billing.dueDays) || 7,
      });
      Alert.alert(t('admin.settings.savedTitle'), t('admin.settings.savedMsg'));
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setSaving(false); }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <PageHeader subtitle={t('admin.settings.subtitle')} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('admin.settings.business')}</Text>
        <FormInput label={t('admin.settings.businessName')} value={business.name ?? ''} onChangeText={setB('name')} />
        <FormInput label={t('admin.settings.gstin')} value={business.gstin ?? ''} onChangeText={setB('gstin')} autoCapitalize="characters" />
        <FormInput label={t('admin.settings.phone')} value={business.phone ?? ''} onChangeText={setB('phone')} keyboardType="phone-pad" />
        <FormInput label={t('admin.settings.email')} value={business.email ?? ''} onChangeText={setB('email')} keyboardType="email-address" autoCapitalize="none" />
        <FormInput label={t('admin.settings.address')} value={business.address ?? ''} onChangeText={setB('address')} multiline />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('admin.settings.billing')}</Text>
        <FormInput label={t('admin.settings.defaultRate')} value={billing.defaultRate ?? ''} onChangeText={setBill('defaultRate')} keyboardType="numeric" />
        <FormInput label={t('admin.settings.taxPercent')} value={billing.taxPercent ?? ''} onChangeText={setBill('taxPercent')} keyboardType="numeric" />
        <FormInput label={t('admin.settings.dueDays')} value={billing.dueDays ?? ''} onChangeText={setBill('dueDays')} keyboardType="numeric" />
      </View>

      <PrimaryButton title={t('admin.settings.saveSettings')} onPress={save} loading={saving} />
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 14 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  });
