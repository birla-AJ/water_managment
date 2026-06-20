import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';
import PillTabBar from '../components/PillTabBar';
import DriverDeliveriesScreen from '../screens/driver/DriverDeliveriesScreen';
import DriverCustomersScreen from '../screens/driver/DriverCustomersScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';

const Tab = createBottomTabNavigator();

/** Bottom-tab dashboard for delivery drivers. */
export default function DriverNavigator() {
  const { colors } = useTheme();
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
      <Tab.Screen name="Deliveries" component={DriverDeliveriesScreen} options={{ title: "Today's Deliveries", tabBarLabel: 'Deliveries' }} />
      <Tab.Screen name="Customers" component={DriverCustomersScreen} options={{ title: 'My Customers', tabBarLabel: 'Customers' }} />
      <Tab.Screen name="Profile" component={DriverProfileScreen} />
    </Tab.Navigator>
  );
}
