import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { Card, Loader, EmptyState } from '../components/ui';
import { notificationApi } from '../api/endpoints';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await notificationApi.list();
      setItems(list);
      notificationApi.markAllRead().catch(() => undefined);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<EmptyState text="No notifications" />}
        renderItem={({ item }) => (
          <Card style={{ flexDirection: 'row' }}>
            <View style={styles.iconWrap}>
              <Icon name="bell-ring" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{dayjs(item.createdAt).format('DD MMM YYYY HH:mm')}</Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    iconWrap: {
      width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primary + '1F', marginRight: 12,
    },
    title: { fontWeight: '800', color: colors.text },
    body: { color: colors.textMuted, marginTop: 2 },
    time: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  });
