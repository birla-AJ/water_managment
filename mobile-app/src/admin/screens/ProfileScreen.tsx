import React from 'react';
import { ScrollView, View, Text, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { authApi } from '../../api/endpoints';
import { PageHeader, Field } from '../components/ui';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  const doLogout = () => {
    Alert.alert(t('admin.profileAdmin.logout'), t('admin.profileAdmin.logoutConfirm'), [
      { text: t('admin.common.cancel'), style: 'cancel' },
      { text: t('admin.profileAdmin.logout'), style: 'destructive', onPress: async () => {
        try { if (refreshToken) await authApi.logout(refreshToken); } catch { /* ignore */ }
        await AsyncStorage.removeItem('wf_tokens');
        dispatch(logout());
      } },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.card}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.name?.[0] ?? 'A').toUpperCase()}</Text></View>
        <Text style={styles.name}>{user?.name ?? t('admin.profileAdmin.adminFallback')}</Text>
        <Text style={styles.role}>{user?.role}</Text>
        <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
          <Field label={t('admin.profileAdmin.email')} value={user?.email} />
          <Field label={t('admin.profileAdmin.mobile')} value={user?.mobile} />
        </View>
      </View>
      <PrimaryButton title={t('admin.profileAdmin.logout')} variant="outline" onPress={doLogout} />
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder,
      padding: 22, alignItems: 'center', marginBottom: 16,
    },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
    name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 12 },
    role: { fontSize: 13, color: colors.primary, fontWeight: '700', marginTop: 2 },
  });
