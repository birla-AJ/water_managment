import React from 'react';
import { ScrollView, View, Text, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PressableScale } from '../../components/anim';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { authApi } from '../../api/endpoints';
import { useLanguage } from '../../hooks/useLanguage';
import LanguageSelectModal from '../../components/LanguageSelectModal';
import { Field } from '../components/ui';
import type { AdminStackParamList } from '../navigation/types';

const LANG_LABELS: Record<string, string> = { en: 'English', hi: 'हिंदी' };

type Nav = NativeStackNavigationProp<AdminStackParamList, 'More'>;

type LinkItem = { labelKey: string; icon: string; screen: keyof AdminStackParamList; color: string; superAdmin?: boolean };

const LINKS: LinkItem[] = [
  // Super-admin-only management
  { labelKey: 'admin.nav.admins', icon: 'shield-account', screen: 'Admins', color: '#055152', superAdmin: true },
  { labelKey: 'admin.nav.serviceAreas', icon: 'map-marker-radius', screen: 'ServiceAreas', color: '#0B6E72', superAdmin: true },
  // Shared / operational
  { labelKey: 'admin.nav.liveTracking', icon: 'map-search', screen: 'LiveTracking', color: '#0E8C84' },
  { labelKey: 'admin.nav.inventory', icon: 'package-variant', screen: 'Inventory', color: '#16A8AE' },
  { labelKey: 'admin.nav.billing', icon: 'receipt', screen: 'Billing', color: '#1AA7B0' },
  { labelKey: 'admin.nav.payments', icon: 'credit-card', screen: 'Payments', color: '#2BB3B8' },
  { labelKey: 'admin.nav.expenses', icon: 'cash-multiple', screen: 'Expenses', color: '#37BDC2' },
  { labelKey: 'admin.nav.reports', icon: 'chart-bar', screen: 'Reports', color: '#0C7C82' },
  { labelKey: 'admin.nav.settings', icon: 'cog', screen: 'Settings', color: '#94A3B8' },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);
  const { current: lang } = useLanguage();
  const { t } = useTranslation();
  const [langOpen, setLangOpen] = React.useState(false);

  const doLogout = () => {
    Alert.alert(t('admin.more.logout'), t('admin.more.logoutConfirm'), [
      { text: t('admin.common.cancel'), style: 'cancel' },
      {
        text: t('admin.more.logout'),
        style: 'destructive',
        onPress: async () => {
          try { if (refreshToken) await authApi.logout(refreshToken); } catch { /* ignore */ }
          await AsyncStorage.removeItem('wf_tokens');
          dispatch(logout());
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Icon name="account" size={42} color="#FFFFFF" /></View>
        <Text style={styles.name} numberOfLines={1}>{user?.name ?? t('admin.more.defaultName')}</Text>
        <Text style={styles.role}>{(user?.role ?? 'ADMIN').replace(/_/g, ' ')}</Text>
        <View style={styles.profileFields}>
          <Field label={t('admin.more.email')} value={user?.email} />
          <Field label={t('admin.more.mobile')} value={user?.mobile} />
        </View>
      </View>

      <View style={styles.grid}>
        {LINKS
          .filter((l) => (user?.role === 'SUPER_ADMIN' ? l.superAdmin || l.screen === 'LiveTracking' : !l.superAdmin))
          .map((l) => (
          <PressableScale key={l.screen} style={styles.tile} onPress={() => navigation.navigate(l.screen as never)}>
            <View style={[styles.tileIcon, { backgroundColor: l.color + '22' }]}>
              <Icon name={l.icon} size={24} color={l.color} />
            </View>
            <Text style={styles.tileText}>{t(l.labelKey)}</Text>
          </PressableScale>
        ))}
      </View>

      <PressableScale style={styles.langRow} onPress={() => setLangOpen(true)}>
        <View style={[styles.langIcon, { backgroundColor: colors.primary + '22' }]}>
          <Icon name="translate" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.langLabel}>{t('admin.more.language')}</Text>
          <Text style={styles.langValue}>{LANG_LABELS[lang] ?? lang}</Text>
        </View>
        <Icon name="chevron-right" size={22} color={colors.textMuted} />
      </PressableScale>

      <PressableScale style={styles.logout} onPress={doLogout}>
        <Icon name="logout" size={20} color={colors.error} />
        <Text style={[styles.tileText, { color: colors.error, marginTop: 0 }]}>{t('admin.more.logout')}</Text>
      </PressableScale>

      <LanguageSelectModal visible={langOpen} onClose={() => setLangOpen(false)} />
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    profileCard: {
      alignItems: 'center', backgroundColor: colors.card,
      borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, padding: 20, marginBottom: 16,
    },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 12 },
    role: { fontSize: 13, color: colors.primary, fontWeight: '800', marginTop: 3 },
    profileFields: { alignSelf: 'stretch', marginTop: 14 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    tile: {
      width: '31%', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder,
      paddingVertical: 18, alignItems: 'center', marginBottom: 12,
    },
    tileIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    tileText: { fontSize: 12, color: colors.text, marginTop: 10, fontWeight: '700', textAlign: 'center' },

    langRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 12,
      backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 14,
    },
    langIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    langLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
    langValue: { fontSize: 15, color: colors.text, fontWeight: '800', marginTop: 2 },
    logout: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10,
      backgroundColor: colors.error + '14', borderRadius: 14, borderWidth: 1, borderColor: colors.error + '44', paddingVertical: 14,
    },
  });
