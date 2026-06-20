import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import PillTabBar from '../../components/PillTabBar';
import type { AdminStackParamList } from './types';

import DashboardScreen from '../../dashboard/DashboardScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerDetailsScreen from '../screens/CustomerDetailsScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import OrdersScreen from '../screens/OrdersScreen';
import MoreScreen from '../screens/MoreScreen';
import DriversScreen from '../screens/DriversScreen';
import DriverDetailsScreen from '../screens/DriverDetailsScreen';
import DriverFormScreen from '../screens/DriverFormScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import InventoryScreen from '../screens/InventoryScreen';
import BillingScreen from '../screens/BillingScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function useStackScreenOptions() {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.bgElevated },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '800' as const },
    contentStyle: { backgroundColor: colors.bg },
  };
}

function DashboardStack() {
  const opts = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
    </Stack.Navigator>
  );
}

function CustomersStack() {
  const opts = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="Customers" component={CustomersScreen} />
      <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen} options={{ title: 'Customer' }} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={{ title: 'Customer' }} />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  const opts = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="Orders" component={OrdersScreen} />
    </Stack.Navigator>
  );
}

// Everything that doesn't get a dedicated tab lives behind the "More" menu.
function MoreStack() {
  const opts = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="More" component={MoreScreen} options={{ title: 'More' }} />
      <Stack.Screen name="Drivers" component={DriversScreen} />
      <Stack.Screen name="DriverDetails" component={DriverDetailsScreen} options={{ title: 'Driver' }} />
      <Stack.Screen name="DriverForm" component={DriverFormScreen} options={{ title: 'Driver' }} />
      <Stack.Screen name="Vehicles" component={VehiclesScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

export default function AdminNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            DashboardTab: 'view-dashboard',
            CustomersTab: 'account-group',
            OrdersTab: 'cart',
            MoreTab: 'dots-horizontal',
          };
          return <Icon name={icons[route.name] ?? 'circle'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="CustomersTab" component={CustomersStack} options={{ title: 'Customers' }} />
      <Tab.Screen name="OrdersTab" component={OrdersStack} options={{ title: 'Orders' }} />
      <Tab.Screen name="MoreTab" component={MoreStack} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}
