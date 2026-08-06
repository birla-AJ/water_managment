import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Card, PrimaryButton, GradientView } from '../components/ui';
import { meApi, distributorApi, DistributorSuggestion } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setProfileComplete, setUser } from '../store/slices/authSlice';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';
import { getCurrentLocation } from '../services/location';

interface Form {
  name: string;
  email: string;
  address: string;
  area: string;
  landmark: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
}

const empty: Form = { name: '', email: '', address: '', area: '', landmark: '', pincode: '', latitude: null, longitude: null };
type TextFieldKey = Exclude<keyof Form, 'latitude' | 'longitude'>;

// IMPORTANT: this must live OUTSIDE the screen component. If it's defined
// inside CompleteProfileScreen(), React treats it as a brand-new component
// type on every render (every keystroke), so it unmounts/remounts every
// TextInput and focus jumps back to the first field. Defining it here once
// keeps its identity stable across re-renders.
function Field({
  label, value, onChange, placeholder, keyboardType, multiline, maxLength, autoCapitalize, styles, colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  multiline?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
}) {
  return (
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
}

export default function CompleteProfileScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const onPrimary = '#FFFFFF';
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  // Distributor selection.
  const [distributors, setDistributors] = useState<DistributorSuggestion[]>([]);
  const [distributorId, setDistributorId] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);
  const [locating, setLocating] = useState(false);

  // Prefill anything we already know (e.g. a returning user who skipped before).
  // The placeholder name "Customer 1234" is treated as blank so they type a real one.
  useEffect(() => {
    (async () => {
      try {
        const p = await meApi.profile();
        const nextForm = {
          name: /^Customer \d{4}$/.test(p?.name ?? '') ? '' : p?.name ?? '',
          email: p?.email ?? '',
          address: p?.address ?? '',
          area: p?.area ?? '',
          landmark: p?.landmark ?? '',
          pincode: p?.pincode ?? '',
          latitude: p?.latitude ?? null,
          longitude: p?.longitude ?? null,
        };
        setForm(nextForm);
        if (p?.distributorId) setDistributorId(p.distributorId);
        if (nextForm.latitude == null || nextForm.longitude == null) {
          setLocating(true);
          try {
            const loc = await getCurrentLocation();
            setForm((f) => ({ ...f, latitude: loc.latitude, longitude: loc.longitude }));
          } catch {
            /* The manual location button remains available. */
          } finally {
            setLocating(false);
          }
        }
      } catch {
        /* start with a blank form */
      }
    })();
  }, []);

  const set = (key: TextFieldKey) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  // Fetch distributors that serve the entered area / pincode.
  const findDistributors = async () => {
    setFinding(true);
    try {
      const list = await distributorApi.suggest({
        area: form.area.trim() || undefined,
        pincode: /^\d{6}$/.test(form.pincode.trim()) ? form.pincode.trim() : undefined,
        lat: form.latitude ?? undefined,
        lng: form.longitude ?? undefined,
      });
      setDistributors(list);
      if (list.length === 1) setDistributorId(list[0].id);
      if (list.length === 0) Alert.alert(t('completeProfileExtra.noDistributorsTitle'), t('completeProfileExtra.noDistributorsMsg'));
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e));
    } finally {
      setFinding(false);
    }
  };

  // Full picker — every active distributor (admin) in the system, for when the
  // customer would rather choose manually than rely on area/GPS matching.
  const showAllDistributors = async () => {
    setFinding(true);
    try {
      const list = await distributorApi.list();
      setDistributors(list);
      if (list.length === 0) Alert.alert(t('completeProfileExtra.noDistributorsTitle'), t('completeProfileExtra.noDistributorsMsg'));
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e));
    } finally {
      setFinding(false);
    }
  };

  const captureLocation = async () => {
    try {
      setLocating(true);
      const loc = await getCurrentLocation();
      setForm((f) => ({ ...f, latitude: loc.latitude, longitude: loc.longitude }));
      Alert.alert(t('completeProfileExtra.locationSavedTitle'), t('completeProfileExtra.locationSavedMsg'));
    } catch (e) {
      Alert.alert(t('completeProfileExtra.locationErrorTitle'), errorMessage(e));
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    const name = form.name.trim();
    const address = form.address.trim();
    const email = form.email.trim();

    const pincode = form.pincode.trim();

    if (name.length < 2) return Alert.alert(t('completeProfileExtra.nameRequiredTitle'), t('completeProfileExtra.nameRequiredMsg'));
    if (!address) return Alert.alert(t('completeProfileExtra.addressRequiredTitle'), t('completeProfileExtra.addressRequiredMsg'));
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Alert.alert(t('completeProfileExtra.invalidEmailTitle'), t('completeProfileExtra.invalidEmailMsg'));
    if (pincode && !/^\d{6}$/.test(pincode)) return Alert.alert(t('completeProfileExtra.invalidPincodeTitle'), t('completeProfileExtra.invalidPincodeMsg'));
    // A distributor is required so the customer is routed to the right dashboard.
    if (!distributorId) {
      return Alert.alert(t('completeProfileExtra.chooseDistributorTitle'), t('completeProfileExtra.chooseDistributorMsg'));
    }

    setSaving(true);
    try {
      await meApi.updateProfile({
        name,
        email: email || undefined,
        address,
        area: form.area.trim() || undefined,
        landmark: form.landmark.trim() || undefined,
        pincode: pincode || undefined,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
        distributorId,
      });
      if (user) dispatch(setUser({ ...user, name }));
      dispatch(setProfileComplete(true));
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <GradientView style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: isDark ? '#FFFFFF22' : '#FFFFFF33' }]}>
            <Icon name="account-edit" size={34} color={onPrimary} />
          </View>
          <Text style={[styles.headerTitle, { color: onPrimary }]}>{t('completeProfileExtra.headerTitle')}</Text>
          <Text style={[styles.headerSub, { color: onPrimary }]}>
            {t('completeProfileExtra.headerSub')}
          </Text>
        </GradientView>

        <Card>
          <Text style={styles.section}>{t('completeProfileExtra.yourDetails')}</Text>
          <Field label={t('completeProfileExtra.fullName')} value={form.name} onChange={set('name')} placeholder={t('completeProfileExtra.fullNamePh')} autoCapitalize="words" styles={styles} colors={colors} />
          <Field label={t('completeProfileExtra.email')} value={form.email} onChange={set('email')} placeholder={t('completeProfileExtra.emailPh')} keyboardType="email-address" autoCapitalize="none" styles={styles} colors={colors} />
            </Card>

        <Card>
          <Text style={styles.section}>{t('completeProfileExtra.deliveryAddress')}</Text>
          <Field label={t('completeProfileExtra.address')} value={form.address} onChange={set('address')} placeholder={t('completeProfileExtra.addressPh')} multiline styles={styles} colors={colors} />
          <Field label={t('completeProfileExtra.area')} value={form.area} onChange={set('area')} placeholder={t('completeProfileExtra.areaPh')} autoCapitalize="words" styles={styles} colors={colors} />
          <Field label={t('completeProfileExtra.pincode')} value={form.pincode} onChange={set('pincode')} placeholder={t('completeProfileExtra.pincodePh')} keyboardType="number-pad" maxLength={6} styles={styles} colors={colors} />
          <Field label={t('completeProfileExtra.landmark')} value={form.landmark} onChange={set('landmark')} placeholder={t('completeProfileExtra.landmarkPh')} styles={styles} colors={colors} />
          <TouchableOpacity style={styles.locationBtn} onPress={captureLocation} activeOpacity={0.8} disabled={locating}>
            {locating ? <ActivityIndicator color={colors.primary} /> : <Icon name="crosshairs-gps" size={18} color={colors.primary} />}
            <Text style={styles.locationBtnText}>
              {locating ? t('completeProfileExtra.capturingLocation') : form.latitude != null && form.longitude != null ? t('completeProfileExtra.updateGps') : t('completeProfileExtra.useCurrentLocation')}
            </Text>
          </TouchableOpacity>
          {form.latitude != null && form.longitude != null ? (
            <Text style={styles.locationMeta}>
              {t('completeProfileExtra.savedGps', { lat: form.latitude.toFixed(5), lng: form.longitude.toFixed(5) })}
            </Text>
          ) : (
            <Text style={styles.locationMeta}>{t('completeProfileExtra.gpsHelp')}</Text>
          )}
        </Card>

        <Card>
          <Text style={styles.section}>{t('completeProfileExtra.yourDistributor')}</Text>
          <Text style={styles.help}>
            {t('completeProfileExtra.distributorHelp')}
          </Text>
          <TouchableOpacity style={styles.findBtn} onPress={findDistributors} disabled={finding} activeOpacity={0.8}>
            {finding ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Icon name="map-search-outline" size={18} color={colors.primary} />
                <Text style={styles.findBtnText}>{t('completeProfileExtra.findDistributors')}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.findBtnSecondary} onPress={showAllDistributors} disabled={finding} activeOpacity={0.8}>
            <Icon name="format-list-bulleted" size={18} color={colors.textMuted} />
            <Text style={styles.findBtnSecondaryText}>{t('completeProfileExtra.showAllDistributors')}</Text>
          </TouchableOpacity>

          {distributors.map((d) => {
            const selected = d.id === distributorId;
            return (
              <TouchableOpacity
                key={d.id}
                activeOpacity={0.8}
                onPress={() => setDistributorId(d.id)}
                style={[styles.distRow, selected && styles.distRowActive]}
              >
                <Icon
                  name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={20}
                  color={selected ? colors.primary : colors.textMuted}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.distName}>{d.name}</Text>
                  <Text style={styles.distMeta} numberOfLines={1}>
                    {[
                      d.distanceKm != null ? t('completeProfileExtra.distanceAway', { km: d.distanceKm }) : null,
                      d.serviceAreas?.length ? d.serviceAreas.slice(0, 3).join(', ') : null,
                    ].filter(Boolean).join(' · ') || t('completeProfileExtra.available')}
                  </Text>
                </View>
                {d.matchReasons?.length ? (
                  <View style={styles.matchPill}>
                    <Text style={styles.matchPillText}>{d.matchReasons[0]}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </Card>

        <PrimaryButton title={t('completeProfileExtra.saveContinue')} onPress={save} loading={saving} />
        <Text style={styles.note}>{t('completeProfileExtra.note')}</Text>
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
    input: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 15 },
    inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
    note: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 },
    help: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, marginBottom: 12 },
    findBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingVertical: 11, marginBottom: 12,
    },
    findBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    findBtnSecondary: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 11, marginBottom: 12,
    },
    findBtnSecondaryText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
    locationBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingVertical: 11, marginTop: 4,
    },
    locationBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    locationMeta: { color: colors.textMuted, fontSize: 11.5, marginTop: 8, textAlign: 'center' },
    distRow: {
      flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: colors.surface,
    },
    distRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryGlow },
    distName: { color: colors.text, fontWeight: '700', fontSize: 14.5 },
    distMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    matchPill: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    matchPillText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '700', textTransform: 'capitalize' },
  });
