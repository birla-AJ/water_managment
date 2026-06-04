import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, PrimaryButton, GradientView } from '../components/ui';
import { meApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setProfileComplete, setUser } from '../store/slices/authSlice';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

interface Form {
  name: string;
  email: string;
  altMobile: string;
  address: string;
  area: string;
  landmark: string;
}

const empty: Form = { name: '', email: '', altMobile: '', address: '', area: '', landmark: '' };

export default function CompleteProfileScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const onPrimary = '#FFFFFF';
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  // Prefill anything we already know (e.g. a returning user who skipped before).
  // The placeholder name "Customer 1234" is treated as blank so they type a real one.
  useEffect(() => {
    (async () => {
      try {
        const p = await meApi.profile();
        setForm({
          name: /^Customer \d{4}$/.test(p?.name ?? '') ? '' : p?.name ?? '',
          email: p?.email ?? '',
          altMobile: p?.altMobile ?? '',
          address: p?.address ?? '',
          area: p?.area ?? '',
          landmark: p?.landmark ?? '',
        });
      } catch {
        /* start with a blank form */
      }
    })();
  }, []);

  const set = (key: keyof Form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const save = async () => {
    const name = form.name.trim();
    const address = form.address.trim();
    const email = form.email.trim();
    const altMobile = form.altMobile.trim();

    if (name.length < 2) return Alert.alert('Name required', 'Please enter your full name.');
    if (!address) return Alert.alert('Address required', 'Please enter your delivery address.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Alert.alert('Invalid email', 'Please enter a valid email address.');
    if (altMobile && !/^[6-9]\d{9}$/.test(altMobile)) return Alert.alert('Invalid mobile', 'Alternate mobile must be a valid 10-digit number.');

    setSaving(true);
    try {
      await meApi.updateProfile({
        name,
        email: email || undefined,
        altMobile: altMobile || undefined,
        address,
        area: form.area.trim() || undefined,
        landmark: form.landmark.trim() || undefined,
      });
      if (user) dispatch(setUser({ ...user, name }));
      dispatch(setProfileComplete(true));
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label, value, onChange, placeholder, keyboardType, multiline, maxLength, autoCapitalize,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'email-address' | 'number-pad';
    multiline?: boolean;
    maxLength?: number;
    autoCapitalize?: 'none' | 'words' | 'sentences';
  }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <GradientView style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: isDark ? '#FFFFFF22' : '#FFFFFF33' }]}>
            <Icon name="account-edit" size={34} color={onPrimary} />
          </View>
          <Text style={[styles.headerTitle, { color: onPrimary }]}>Complete your profile</Text>
          <Text style={[styles.headerSub, { color: onPrimary }]}>
            We need a few details to set up your water deliveries.
          </Text>
        </GradientView>

        <Card>
          <Text style={styles.section}>Your details</Text>
          <Field label="Full Name *" value={form.name} onChange={set('name')} placeholder="e.g. Rahul Sharma" autoCapitalize="words" />
          <Field label="Email" value={form.email} onChange={set('email')} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Alternate Mobile" value={form.altMobile} onChange={set('altMobile')} placeholder="10-digit number" keyboardType="number-pad" maxLength={10} />
        </Card>

        <Card>
          <Text style={styles.section}>Delivery address</Text>
          <Field label="Address *" value={form.address} onChange={set('address')} placeholder="House / flat no, street, building" multiline />
          <Field label="Area" value={form.area} onChange={set('area')} placeholder="Locality / sector" autoCapitalize="words" />
          <Field label="Landmark" value={form.landmark} onChange={set('landmark')} placeholder="Nearby landmark" />
        </Card>

        <PrimaryButton title="Save & Continue" onPress={save} loading={saving} />
        <Text style={styles.note}>You can update these anytime from your Profile.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    header: { borderRadius: 20, padding: 22, alignItems: 'center', marginBottom: 16 },
    headerIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    headerSub: { marginTop: 6, textAlign: 'center', opacity: 0.9, fontSize: 13, lineHeight: 18 },
    section: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
    label: { color: colors.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' },
    input: { backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 15 },
    inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
    note: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 },
  });
