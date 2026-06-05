import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, Loader, PrimaryButton } from '../../components/ui';
import { driverApi } from '../../api/endpoints';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';

interface DriverProfile {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  zone?: string;
  status: string;
  vehicle?: { id: string; number: string; type?: string; capacity?: number } | null;
  stats?: { assignedCustomers: number; deliveredToday: number };
}

function Row({ label, value, colors }: { label: string; value: React.ReactNode; colors: AppColors }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

export default function DriverProfileScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await driverApi.profile());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doLogout = async () => {
    await AsyncStorage.removeItem('wf_tokens');
    dispatch(logout());
  };

  if (loading || !profile) return <Loader />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Card>
        <View style={styles.head}>
          <View style={styles.avatar}><Icon name="truck" size={28} color="#FFFFFF" /></View>
          <View>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.sub}>{profile.mobile}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Assignment</Text>
        <Row label="Zone" value={profile.zone ?? '—'} colors={colors} />
        <Row label="Vehicle" value={profile.vehicle ? `${profile.vehicle.number}${profile.vehicle.type ? ` (${profile.vehicle.type})` : ''}` : '—'} colors={colors} />
        <Row label="Status" value={profile.status} colors={colors} />
      </Card>

      <Card>
        <Text style={styles.section}>Today</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statNum}>{profile.stats?.assignedCustomers ?? 0}</Text><Text style={styles.statLabel}>Customers</Text></View>
          <View style={styles.stat}><Text style={styles.statNum}>{profile.stats?.deliveredToday ?? 0}</Text><Text style={styles.statLabel}>Delivered today</Text></View>
        </View>
      </Card>

      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('DriverNotifications')}>
        <Icon name="bell-outline" size={20} color={colors.primary} />
        <Text style={styles.linkText}>Notifications</Text>
        <Icon name="chevron-right" size={20} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      <View style={{ marginTop: 16 }}>
        <PrimaryButton title="Log out" variant="outline" onPress={doLogout} />
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 18, fontWeight: '800', color: colors.text },
    sub: { color: colors.textMuted, marginTop: 2 },
    section: { fontSize: 13, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    stat: { alignItems: 'center' },
    statNum: { fontSize: 24, fontWeight: '800', color: colors.text },
    statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, padding: 16, marginTop: 4 },
    linkText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  });
