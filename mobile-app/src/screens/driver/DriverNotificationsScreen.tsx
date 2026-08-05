import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Card, Loader, EmptyState } from '../../components/ui';
import { driverApi, notificationApi } from '../../api/endpoints';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';

interface Note {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default function DriverNotificationsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await driverApi.notifications();
      setItems(list);
      notificationApi.markAllRead().catch(() => undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Loader />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={items}
      keyExtractor={(i) => i.id}
      onRefresh={load}
      refreshing={loading}
      ListEmptyComponent={<EmptyState text={t('driverNotifications.empty')} />}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <Card style={!item.isRead ? { borderColor: colors.primary } : undefined}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.time}>{dayjs(item.createdAt).format('DD MMM YYYY, hh:mm A')}</Text>
        </Card>
      )}
    />
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    title: { fontSize: 15, fontWeight: '800', color: colors.text },
    body: { color: colors.textMuted, marginTop: 4 },
    time: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  });
