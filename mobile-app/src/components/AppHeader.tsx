import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

/**
 * Branded navigation header used across the app.
 *
 * Drop-in for React Navigation's `header` option (works for both native-stack
 * and bottom-tabs). Renders a clean elevated bar with a teal water-drop brand
 * mark, a large title with a gradient accent underline, an optional circular
 * back button, and a right-hand slot fed from `options.headerRight`.
 */
export default function AppHeader({ navigation, route, options, back }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const title: string = options?.title ?? options?.headerTitle ?? route?.name ?? '';
  const canGoBack = !!back;
  const right = options?.headerRight?.({ tintColor: colors.primary });

  return (
    <View style={[s.wrap, { paddingTop: insets.top }]}>
      <View style={s.row}>
        {canGoBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-left" size={26} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={s.brandBadge}>
            <Icon name="water" size={20} color={colors.primary} />
          </View>
        )}

        <View style={s.titleWrap}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          <LinearGradient
            colors={[colors.primary, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.accent}
          />
        </View>

        <View style={s.right}>{right}</View>
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
      // soft drop shadow so the bar lifts off the cream backdrop
      shadowColor: colors.primary,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      ...Platform.select({ android: { elevation: 4 } }),
    },
    row: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    brandBadge: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.primary + '14',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    titleWrap: { flex: 1, justifyContent: 'center' },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.2,
    },
    accent: {
      marginTop: 5,
      height: 3,
      width: 30,
      borderRadius: 2,
    },
    right: { marginLeft: 12, alignItems: 'flex-end', justifyContent: 'center' },
  });
