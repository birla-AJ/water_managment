import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';
import DriverDeliveriesScreen from '../screens/driver/DriverDeliveriesScreen';
import DriverCustomersScreen from '../screens/driver/DriverCustomersScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';

const Tab = createBottomTabNavigator();

function ThemeToggleButton() {
  const { isDark, toggle, colors } = useTheme();
  return (
    <TouchableOpacity onPress={toggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 16 }}>
      <Icon name={isDark ? 'weather-sunny' : 'weather-night'} size={22} color={colors.primary} />
    </TouchableOpacity>
  );
}

/** Bottom-tab dashboard for delivery drivers. */
export default function DriverNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.bgElevated },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => <ThemeToggleButton />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Deliveries: 'truck-delivery',
            Customers: 'account-group',
            Profile: 'account',
          };
          return <Icon name={icons[route.name] ?? 'circle'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Deliveries" component={DriverDeliveriesScreen} options={{ title: "Today's Deliveries" }} />
      <Tab.Screen name="Customers" component={DriverCustomersScreen} options={{ title: 'My Customers' }} />
      <Tab.Screen name="Profile" component={DriverProfileScreen} />
    </Tab.Navigator>
  );
}
