import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import PillTabBar from '../components/PillTabBar';
import DriverDeliveriesScreen from '../screens/driver/DriverDeliveriesScreen';
import DriverCustomersScreen from '../screens/driver/DriverCustomersScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';

const Tab = createBottomTabNavigator();

/** Bottom-tab dashboard for delivery drivers. */
export default function DriverNavigator() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.bgElevated },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
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
      <Tab.Screen name="Deliveries" component={DriverDeliveriesScreen} options={{ title: t('nav.todaysDeliveries'), tabBarLabel: t('nav.deliveries') }} />
      <Tab.Screen name="Customers" component={DriverCustomersScreen} options={{ title: t('nav.myCustomers'), tabBarLabel: t('nav.customers') }} />
      <Tab.Screen name="Profile" component={DriverProfileScreen} options={{ title: t('nav.profile'), tabBarLabel: t('nav.profile') }} />
    </Tab.Navigator>
  );
}
