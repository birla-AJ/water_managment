import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useAppSelector } from '../store/hooks';
import PillTabBar from '../components/PillTabBar';
import AppHeader from '../components/AppHeader';
import FloatingAiChat from '../components/ai/FloatingAiChat';
import FirstLoginLanguageGate from '../components/FirstLoginLanguageGate';

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
import TrackDeliveryScreen from '../screens/TrackDeliveryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SupportScreen from '../screens/SupportScreen';
import DeliveryCalendarScreen from '../screens/DeliveryCalendarScreen';
import DriverNavigator from './DriverNavigator';
import AdminNavigator from '../admin/navigation/AdminNavigator';
import DriverNotificationsScreen from '../screens/driver/DriverNotificationsScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={({ route }) => ({
        header: (props) => <AppHeader {...props} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('nav.home'), tabBarLabel: t('nav.home') }} />
      <Tab.Screen name="Deliveries" component={DeliveriesScreen} options={{ title: t('nav.deliveries'), tabBarLabel: t('nav.deliveries') }} />
      <Tab.Screen name="Order" component={OrderCamperScreen} options={{ title: t('nav.orderCamper'), tabBarLabel: t('nav.order') }} />
      <Tab.Screen name="Bills" component={BillingScreen} options={{ title: t('nav.bills'), tabBarLabel: t('nav.bills') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('nav.profile'), tabBarLabel: t('nav.profile') }} />
    </Tab.Navigator>
  );
}

function CustomerMainWithAi() {
  return (
    <View style={{ flex: 1 }}>
      <MainTabs />
      <FloatingAiChat />
    </View>
  );
}

function AdminMainWithAi() {
  return (
    <View style={{ flex: 1 }}>
      <AdminNavigator />
      <FloatingAiChat />
    </View>
  );
}

export default function RootNavigator() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { accessToken, bootstrapped, profileComplete, user } = useAppSelector((s) => s.auth);
  const isDriver = user?.role === 'DRIVER';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <>
    <Stack.Navigator
      screenOptions={{
        header: (props) => <AppHeader {...props} />,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {!bootstrapped ? (
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      ) : !accessToken ? (
        <>
          <Stack.Screen name="OtpLogin" component={OtpLoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} options={{ title: t('nav.verifyOtp') }} />
        </>
      ) : isAdmin ? (
        <Stack.Screen name="AdminMain" component={AdminMainWithAi} options={{ headerShown: false }} />
      ) : isDriver ? (
        <>
          <Stack.Screen name="DriverMain" component={DriverNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="DriverNotifications" component={DriverNotificationsScreen} options={{ title: t('nav.notifications') }} />
        </>
      ) : !profileComplete ? (
        <Stack.Screen
          name="CompleteProfile"
          component={CompleteProfileScreen}
          options={{ title: t('nav.yourDetails'), headerBackVisible: false, gestureEnabled: false }}
        />
      ) : (
        <>
          <Stack.Screen name="Main" component={CustomerMainWithAi} options={{ headerShown: false }} />
          <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: t('nav.orderHistory') }} />
          <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: t('nav.paymentHistory') }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('nav.notifications') }} />
          <Stack.Screen name="TrackDelivery" component={TrackDeliveryScreen} options={{ title: t('nav.trackDelivery') }} />
          <Stack.Screen name="Support" component={SupportScreen} options={{ title: t('home.support') }} />
          <Stack.Screen name="DeliveryCalendar" component={DeliveryCalendarScreen} options={{ title: t('nav.myWaterDays') }} />
        </>
      )}
    </Stack.Navigator>
    <FirstLoginLanguageGate />
    </>
  );
}
