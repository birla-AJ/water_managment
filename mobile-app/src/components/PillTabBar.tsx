import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';

/**
 * Floating "pill" bottom tab bar: a rounded teal-gradient bar where the active
 * tab expands into a light pill (icon + label) and inactive tabs are icon-only.
 * Reuses each navigator's `tabBarIcon` / `tabBarLabel` options, so it drops into
 * any createBottomTabNavigator via the `tabBar` prop.
 */
export default function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom ? insets.bottom : 12 }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bar, { shadowColor: colors.primary }]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;

          const rawLabel = options.tabBarLabel ?? options.title ?? route.name;
          const label = typeof rawLabel === 'string' ? rawLabel : route.name;
          const icon = options.tabBarIcon?.({
            focused,
            color: focused ? colors.primary : 'rgba(255,255,255,0.95)',
            size: 22,
          });

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.85}
              style={[styles.item, focused ? styles.itemActive : styles.itemInactive]}
            >
              {icon}
              {focused && (
                <Text numberOfLines={1} style={[styles.label, { color: colors.primary }]}>
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 6, backgroundColor: 'transparent' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 32,
    paddingHorizontal: 8,
    height: 64,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  item: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  itemActive: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 16, gap: 8, flexShrink: 1 },
  itemInactive: { width: 48 },
  label: { fontWeight: '800', fontSize: 13 },
});
