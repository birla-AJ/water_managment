import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, Switch, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Card, PrimaryButton } from '../components/ui';
import { meApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { current: lang, change: changeLanguage } = useLanguage();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const onPrimary = '#FFFFFF';
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setProfile(await meApi.profile()); } catch { /* ignore */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    setSaving(true);
    try {
      await meApi.updateProfile({
        name: profile.name, email: profile.email, address: profile.address, area: profile.area, landmark: profile.landmark, altMobile: profile.altMobile,
      });
      Alert.alert(t('profile.saved'), t('profile.savedMsg'));
    } catch (e) { Alert.alert(t('common.error'), errorMessage(e)); } finally { setSaving(false); }
  };

  const togglePause = async () => {
    try {
      if (profile.isPaused) await meApi.resume();
      else await meApi.pause();
      load();
    } catch (e) { Alert.alert(t('common.error'), errorMessage(e)); }
  };

  const doLogout = async () => {
    await AsyncStorage.removeItem('wf_tokens');
    dispatch(logout());
  };

  const Field = ({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value ?? ''} onChangeText={onChange} placeholder={label} placeholderTextColor={colors.textMuted} />
    </View>
  );

  if (!profile) return null;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Card style={{ alignItems: 'center' }}>
        <View style={styles.avatar}><Text style={[styles.avatarText, { color: onPrimary }]}>{profile.name?.[0]?.toUpperCase()}</Text></View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.mobile}>+91 {profile.mobile}</Text>
      </Card>

      <Card>
        <View style={styles.pauseRow}>
          <View>
            <Text style={styles.pauseTitle}>{t('profile.pauseDeliveries')}</Text>
            <Text style={styles.pauseSub}>{t('profile.pauseSub')}</Text>
          </View>
          <Switch value={!!profile.isPaused} onValueChange={togglePause} trackColor={{ true: colors.primary }} />
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>{t('language.title')}</Text>
        <View style={styles.langRow}>
          {(['en', 'hi'] as const).map((code) => {
            const active = lang === code;
            return (
              <TouchableOpacity
                key={code}
                onPress={() => changeLanguage(code)}
                style={[styles.langBtn, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : 'transparent' }]}
              >
                <Text style={{ color: active ? onPrimary : colors.text, fontWeight: '700' }}>
                  {code === 'en' ? 'English' : 'हिंदी'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>{t('profile.editProfile')}</Text>
        <Field label={t('common.name')} value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} />
        <Field label={t('common.email')} value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} />
        <Field label={t('profileExtra.alternateMobile')} value={profile.altMobile} onChange={(v) => setProfile({ ...profile, altMobile: v })} />
        <Field label={t('common.address')} value={profile.address} onChange={(v) => setProfile({ ...profile, address: v })} />
        <Field label={t('profileExtra.area')} value={profile.area} onChange={(v) => setProfile({ ...profile, area: v })} />
        <Field label={t('profileExtra.landmark')} value={profile.landmark} onChange={(v) => setProfile({ ...profile, landmark: v })} />
        <PrimaryButton title={t('common.save')} onPress={save} loading={saving} />
      </Card>

      <TouchableOpacity style={styles.supportRow} onPress={() => navigation.navigate('Support')}>
        <Icon name="headset" size={22} color={colors.primary} />
        <Text style={styles.supportText}>{t('profile.contactSupport')}</Text>
        <Icon name="chevron-right" size={22} color={colors.textMuted} />
      </TouchableOpacity>

      <PrimaryButton title={t('profile.logout')} variant="outline" onPress={doLogout} />
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 30, fontWeight: '800' },
    name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 10 },
    mobile: { color: colors.textMuted, marginTop: 2 },
    pauseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pauseTitle: { fontWeight: '700', color: colors.text },
    pauseSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    langRow: { flexDirection: 'row', gap: 12 },
    langBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    section: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
    label: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
    input: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
    supportRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder },
    supportText: { flex: 1, marginLeft: 12, fontWeight: '700', color: colors.text },
  });
