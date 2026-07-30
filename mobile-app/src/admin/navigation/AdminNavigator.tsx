import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import PillTabBar from '../../components/PillTabBar';
import AdminHeader from '../components/AdminHeader';
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
import ExpensesScreen from '../screens/ExpensesScreen';
import ServiceAreasScreen from '../screens/ServiceAreasScreen';
import AdminsScreen from '../screens/AdminsScreen';
import AdminDetailsScreen from '../screens/AdminDetailsScreen';
import LiveTrackingScreen from '../screens/LiveTrackingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<AdminStackParamList>();

// Bottom tabs: the four primary destinations. Everything else is reached from
// the profile/menu screen (opened via the header's profile icon).
function AdminTabs() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={({ route }) => ({
        header: (props) => <AdminHeader {...props} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            DashboardTab: 'view-dashboard',
            CustomersTab: 'account-group',
            OrdersTab: 'cart',
            DriversTab: 'truck',
          };
          return <Icon name={icons[route.name] ?? 'circle'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: t('admin.nav.dashboard') }} />
      <Tab.Screen name="CustomersTab" component={CustomersScreen} options={{ title: t('admin.nav.customers') }} />
      <Tab.Screen name="OrdersTab" component={OrdersScreen} options={{ title: t('admin.nav.orders') }} />
      <Tab.Screen name="DriversTab" component={DriversScreen} options={{ title: t('admin.nav.driversVehicles') }} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ header: (props) => <AdminHeader {...props} /> }}>
      <Stack.Screen name="Tabs" component={AdminTabs} options={{ headerShown: false }} />

      {/* Profile / menu hub + everything reachable from it */}
      <Stack.Screen name="More" component={MoreScreen} options={{ title: t('admin.nav.profile') }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('admin.nav.notifications') }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t('admin.nav.profile') }} />

      <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen} options={{ title: t('admin.nav.customer') }} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={{ title: t('admin.nav.customer') }} />

      <Stack.Screen name="DriverDetails" component={DriverDetailsScreen} options={{ title: t('admin.nav.driver') }} />
      <Stack.Screen name="DriverForm" component={DriverFormScreen} options={{ title: t('admin.nav.driver') }} />
      <Stack.Screen name="Vehicles" component={VehiclesScreen} options={{ title: t('admin.nav.vehicles') }} />

      <Stack.Screen name="Inventory" component={InventoryScreen} options={{ title: t('admin.nav.inventory') }} />
      <Stack.Screen name="Billing" component={BillingScreen} options={{ title: t('admin.nav.billing') }} />
      <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: t('admin.nav.payments') }} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: t('admin.nav.expenses') }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: t('admin.nav.reports') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('admin.nav.settings') }} />
      <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} options={{ title: t('admin.nav.liveTracking') }} />

      <Stack.Screen name="ServiceAreas" component={ServiceAreasScreen} options={{ title: t('admin.nav.serviceAreas') }} />
      <Stack.Screen name="Admins" component={AdminsScreen} options={{ title: t('admin.nav.admins') }} />
      <Stack.Screen name="AdminDetails" component={AdminDetailsScreen} options={{ title: t('admin.nav.distributor') }} />
    </Stack.Navigator>
  );
}
