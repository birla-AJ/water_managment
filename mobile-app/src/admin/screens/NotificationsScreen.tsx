import React, { useCallback, useState } from 'react';
import { View, FlatList, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { adminNotificationApi } from '../api';
import type { AdminNotification } from '../types';
import { PageHeader, Loader, EmptyState } from '../components/ui';

function visualFor(type: string): { icon: string; color: string } {
  const t = (type ?? '').toUpperCase();
  if (t.includes('ORDER')) return { icon: 'cart', color: '#0E8388' };
  if (t.includes('PAY')) return { icon: 'cash', color: '#16A34A' };
  if (t.includes('DELIV')) return { icon: 'truck', color: '#0EA5B5' };
  if (t.includes('BILL') || t.includes('INVOICE')) return { icon: 'receipt', color: '#16A8AE' };
  if (t.includes('INVENT') || t.includes('STOCK')) return { icon: 'package-variant', color: '#0891B2' };
  return { icon: 'bell-ring', color: '#0C7C82' };
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const r = await adminNotificationApi.list({ limit: 100 }); setItems(r.data ?? []); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unread = items.filter((n) => !n.isRead).length;

  const markAll = async () => { try { await adminNotificationApi.markAllRead(); load(); } catch { /* ignore */ } };
  const markOne = async (id: string) => { try { await adminNotificationApi.markRead(id); load(); } catch { /* ignore */ } };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={
          <PageHeader
            subtitle={unread ? t('admin.notifications.unread', { count: unread }) : t('admin.notifications.allCaughtUp')}
            action={
              unread ? (
                <TouchableOpacity onPress={markAll} style={styles.markAll}>
                  <Text style={styles.markAllText}>{t('admin.notifications.markAllRead')}</Text>
                </TouchableOpacity>
              ) : undefined
            }
          />
        }
        renderItem={({ item }) => {
          const v = visualFor(item.type);
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => !item.isRead && markOne(item.id)}
              style={[styles.row, !item.isRead && { backgroundColor: v.color + '12', borderColor: v.color + '44' }]}
            >
              <View style={[styles.icon, { backgroundColor: v.color + '1F' }]}><Icon name={v.icon} size={20} color={v.color} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { fontWeight: item.isRead ? '600' : '800' }]}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{dayjs(item.createdAt).format('DD MMM YYYY, HH:mm')}</Text>
              </View>
              {!item.isRead && <View style={[styles.dot, { backgroundColor: v.color }]} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="bell-off-outline" text={t('admin.notifications.empty')} />}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      />
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    markAll: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.primary },
    markAllText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
      borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 14, marginBottom: 10,
    },
    icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 15, color: colors.text },
    body: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    time: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    dot: { width: 10, height: 10, borderRadius: 5 },
  });
