import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { adminSettingsApi } from '../api';
import { PageHeader, FormInput, Loader } from '../components/ui';

export default function SettingsScreen() {
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
      Alert.alert('Saved', 'Settings updated.');
    } catch (e) { Alert.alert('Error', errorMessage(e)); } finally { setSaving(false); }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <PageHeader title="Settings" subtitle="Business & billing configuration" />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Business</Text>
        <FormInput label="Business Name" value={business.name ?? ''} onChangeText={setB('name')} />
        <FormInput label="GSTIN" value={business.gstin ?? ''} onChangeText={setB('gstin')} autoCapitalize="characters" />
        <FormInput label="Phone" value={business.phone ?? ''} onChangeText={setB('phone')} keyboardType="phone-pad" />
        <FormInput label="Email" value={business.email ?? ''} onChangeText={setB('email')} keyboardType="email-address" autoCapitalize="none" />
        <FormInput label="Address" value={business.address ?? ''} onChangeText={setB('address')} multiline />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Billing</Text>
        <FormInput label="Default Rate (₹)" value={billing.defaultRate ?? ''} onChangeText={setBill('defaultRate')} keyboardType="numeric" />
        <FormInput label="Tax %" value={billing.taxPercent ?? ''} onChangeText={setBill('taxPercent')} keyboardType="numeric" />
        <FormInput label="Due Days" value={billing.dueDays ?? ''} onChangeText={setBill('dueDays')} keyboardType="numeric" />
      </View>

      <PrimaryButton title="Save Settings" onPress={save} loading={saving} />
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 14 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  });
