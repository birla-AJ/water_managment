import React from 'react';
import { ScrollView, View, Text, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PressableScale } from '../../components/anim';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { authApi } from '../../api/endpoints';
import type { AdminStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'More'>;

const LINKS: { label: string; icon: string; screen: keyof AdminStackParamList; color: string }[] = [
  { label: 'Drivers', icon: 'truck', screen: 'Drivers', color: '#3B82F6' },
  { label: 'Vehicles', icon: 'car', screen: 'Vehicles', color: '#0FB8C0' },
  { label: 'Inventory', icon: 'package-variant', screen: 'Inventory', color: '#8B5CF6' },
  { label: 'Billing', icon: 'receipt', screen: 'Billing', color: '#F59E0B' },
  { label: 'Payments', icon: 'credit-card', screen: 'Payments', color: '#10B981' },
  { label: 'Notifications', icon: 'bell', screen: 'Notifications', color: '#EC4899' },
  { label: 'Reports', icon: 'chart-bar', screen: 'Reports', color: '#22D3EE' },
  { label: 'Settings', icon: 'cog', screen: 'Settings', color: '#94A3B8' },
  { label: 'Profile', icon: 'account-circle', screen: 'Profile', color: '#2DD4BF' },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  const doLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
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
        <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.name?.[0] ?? 'A').toUpperCase()}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>{user?.name ?? 'Admin'}</Text>
          <Text style={styles.sub} numberOfLines={1}>{user?.email ?? user?.mobile ?? ''}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {LINKS.map((l) => (
          <PressableScale key={l.screen} style={styles.tile} onPress={() => navigation.navigate(l.screen as never)}>
            <View style={[styles.tileIcon, { backgroundColor: l.color + '22' }]}>
              <Icon name={l.icon} size={24} color={l.color} />
            </View>
            <Text style={styles.tileText}>{l.label}</Text>
          </PressableScale>
        ))}
      </View>

      <PressableScale style={styles.logout} onPress={doLogout}>
        <Icon name="logout" size={20} color={colors.error} />
        <Text style={[styles.tileText, { color: colors.error, marginTop: 0 }]}>Log out</Text>
      </PressableScale>
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    profileCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
      borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 16,
    },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
    name: { fontSize: 17, fontWeight: '800', color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    tile: {
      width: '31%', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder,
      paddingVertical: 18, alignItems: 'center', marginBottom: 12,
    },
    tileIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    tileText: { fontSize: 12, color: colors.text, marginTop: 10, fontWeight: '700', textAlign: 'center' },

    logout: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10,
      backgroundColor: colors.error + '14', borderRadius: 14, borderWidth: 1, borderColor: colors.error + '44', paddingVertical: 14,
    },
  });
