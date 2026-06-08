import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';
import { useAppSelector } from '../store/hooks';

import SplashScreen from '../screens/SplashScreen';
import OtpLoginScreen from '../screens/OtpLoginScreen';
import OtpVerifyScreen from '../screens/OtpVerifyScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import HomeScreen from '../screens/HomeScreen';
import DeliveriesScreen from '../screens/DeliveriesScreen';
import OrderCamperScreen from '../screens/OrderCamperScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import BillingScreen from '../screens/BillingScreen';
import PaymentHistoryScreen from '../screens/PaymentHistoryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SupportScreen from '../screens/SupportScreen';
import SkipDeliveriesScreen from '../screens/SkipDeliveriesScreen';
import DriverNavigator from './DriverNavigator';
import AdminNavigator from '../admin/navigation/AdminNavigator';
import DriverNotificationsScreen from '../screens/driver/DriverNotificationsScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function ThemeToggleButton() {
  const { isDark, toggle, colors } = useTheme();
  return (
    <TouchableOpacity onPress={toggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 16 }}>
      <Icon name={isDark ? 'weather-sunny' : 'weather-night'} size={22} color={colors.primary} />
    </TouchableOpacity>
  );
}

function MainTabs() {
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
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, string> = {
            Home: 'home-variant', Deliveries: 'truck-delivery', Order: 'water-plus', Bills: 'receipt', Profile: 'account',
          };
          return (
            <View
              style={
                focused
                  ? { shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }
                  : undefined
              }
            >
              <Icon name={icons[route.name] ?? 'circle'} size={size} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Deliveries" component={DeliveriesScreen} />
      <Tab.Screen name="Order" component={OrderCamperScreen} options={{ title: 'Order Camper' }} />
      <Tab.Screen name="Bills" component={BillingScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { colors } = useTheme();
  const { accessToken, bootstrapped, profileComplete, user } = useAppSelector((s) => s.auth);
  const isDriver = user?.role === 'DRIVER';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgElevated },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {!bootstrapped ? (
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      ) : !accessToken ? (
        <>
          <Stack.Screen name="OtpLogin" component={OtpLoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} options={{ title: 'Verify OTP' }} />
        </>
      ) : isAdmin ? (
        <Stack.Screen name="AdminMain" component={AdminNavigator} options={{ headerShown: false }} />
      ) : isDriver ? (
        <>
          <Stack.Screen name="DriverMain" component={DriverNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="DriverNotifications" component={DriverNotificationsScreen} options={{ title: 'Notifications' }} />
        </>
      ) : !profileComplete ? (
        <Stack.Screen
          name="CompleteProfile"
          component={CompleteProfileScreen}
          options={{ title: 'Your Details', headerBackVisible: false, gestureEnabled: false }}
        />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'Order History' }} />
          <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="SkipDeliveries" component={SkipDeliveriesScreen} options={{ title: 'Skip Deliveries' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
