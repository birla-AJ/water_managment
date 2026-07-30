import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { adminNotificationApi } from '../api';

/**
 * Admin navigation header shown on every admin screen.
 *
 * - Top-level screens: a circular profile button on the left (opens the profile
 *   / menu screen) and a notification bell on the right (opens Notifications).
 * - Pushed screens: the profile button is replaced by a back button; the bell
 *   stays on the right. The bell carries an unread-count badge.
 */
export default function AdminHeader({ navigation, route, options, back }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [unread, setUnread] = useState(0);

  const title: string = options?.title ?? options?.headerTitle ?? route?.name ?? '';
  const canGoBack = !!back;
  const onNotifications = route?.name === 'Notifications';
  const onMore = route?.name === 'More';

  useEffect(() => {
    let alive = true;
    const fetchUnread = () => {
      adminNotificationApi.unreadCount().then((c) => { if (alive) setUnread(c); }).catch(() => {});
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 25000);
    const sub = navigation.addListener?.('focus', fetchUnread);
    return () => { alive = false; clearInterval(t); sub?.(); };
  }, [navigation]);

  return (
    <View style={[s.wrap, { paddingTop: insets.top }]}>
      <View style={s.row}>
        {canGoBack && (
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={s.circleBtn} hitSlop={8}>
            <Icon name="chevron-left" size={26} color={colors.primary} />
          </TouchableOpacity>
        )}

        <View style={s.titleWrap}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
        </View>

        {/* Right cluster: profile icon first, then the notification bell. */}
        <View style={s.right}>
         
          {!onNotifications && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Notifications')} style={s.circleBtn} hitSlop={8}>
              <Icon name="bell-outline" size={22} color={colors.primary} />
              {unread > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
           {!onMore && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('More')} style={s.avatarBtn} hitSlop={8}>
              <Icon name="account" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: colors.bgElevated,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      shadowColor: colors.primary,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      ...Platform.select({ android: { elevation: 4 } }),
    },
    row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
    avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    circleBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center',
    },
    right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    titleWrap: { flex: 1, justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.2 },
    badge: {
      position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9,
      backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
      borderWidth: 1.5, borderColor: colors.bgElevated,
    },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  });
