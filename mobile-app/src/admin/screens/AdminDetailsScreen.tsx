import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { errorMessage } from '../../api/client';
import { adminManageApi } from '../api';
import type { AdminAccount, Customer } from '../types';
import { PageHeader, Field, StatusChip, Loader, RowCard, EmptyState } from '../components/ui';
import type { AdminStackParamList } from '../navigation/types';

export default function AdminDetailsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { params } = useRoute<RouteProp<AdminStackParamList, 'AdminDetails'>>();
  const id = params.id;

  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [a, cs] = await Promise.all([
        adminManageApi.get(id),
        adminManageApi.customers(id).catch(() => []),
      ]);
      setAdmin(a);
      setCustomers(cs);
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !admin) return <Loader />;

  const gps = admin.latitude != null && admin.longitude != null ? `${admin.latitude}, ${admin.longitude}` : '—';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <PageHeader title={admin.name} subtitle={t('admin.adminDetails.subtitle', { email: admin.email })} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('admin.adminDetails.account')}</Text>
        <View style={styles.fieldInline}><Text style={styles.fieldLabel}>{t('admin.adminDetails.status')}</Text><StatusChip status={admin.isActive === false ? 'INACTIVE' : 'ACTIVE'} /></View>
        <Field label={t('admin.adminDetails.role')} value={(admin.role ?? 'ADMIN').replace(/_/g, ' ')} />
        <Field label={t('admin.adminDetails.mobile')} value={admin.mobile} />
        <Field label={t('admin.adminDetails.phone')} value={admin.phone} />
        <Field label={t('admin.adminDetails.customers')} value={admin._count?.customers ?? customers.length} />
        <Field label={t('admin.adminDetails.lastLogin')} value={admin.lastLoginAt ? dayjs(admin.lastLoginAt).format('DD MMM YYYY HH:mm') : t('admin.adminDetails.never')} />
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>{t('admin.adminDetails.serviceArea')}</Text>
        <Field label={t('admin.adminDetails.gps')} value={gps} />
        <Field label={t('admin.adminDetails.serviceRadius')} value={admin.serviceRadiusKm != null ? t('admin.adminDetails.kmValue', { value: admin.serviceRadiusKm }) : '—'} />
        <Field label={t('admin.adminDetails.pincodes')} value={(admin.pincodes ?? []).join(', ') || '—'} />
        <Field label={t('admin.adminDetails.areasText')} value={(admin.serviceAreas ?? []).join(', ') || '—'} />
        <Field label={t('admin.adminDetails.areasMaster')} value={(admin.areaLinks ?? []).map((l) => l.name).join(', ') || '—'} />
      </View>

      <View style={{ height: 16 }} />
      <Text style={styles.sectionTitle}>{t('admin.adminDetails.customersCount', { count: customers.length })}</Text>
      {customers.length === 0 ? (
        <EmptyState icon="account-group-outline" text={t('admin.adminDetails.noCustomers')} />
      ) : customers.map((c) => (
        <RowCard
          key={c.id}
          leftIcon="account"
          title={c.name}
          subtitle={c.mobile}
          meta={[c.area, c.customerType].filter(Boolean).join(' · ')}
          right={<StatusChip status={c.status} />}
        />
      ))}
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
    fieldInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 },
  });
