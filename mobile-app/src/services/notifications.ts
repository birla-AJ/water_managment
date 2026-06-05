import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import { authApi, driverApi } from '../api/endpoints';
import type { UserRole } from '../store/slices/authSlice';

const CHANNEL_ID = 'default';

/** Ensure the Android notification channel exists (required on Android 8+). */
export async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'General',
    importance: AndroidImportance.HIGH,
  });
}

/** Display a heads-up local notification (used for foreground & data messages). */
export async function displayNotification(title?: string, body?: string, data?: Record<string, string>): Promise<void> {
  await ensureChannel();
  await notifee.displayNotification({
    title: title ?? 'WaterFlow',
    body: body ?? '',
    data: data ?? {},
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_launcher',
      pressAction: { id: 'default' },
    },
  });
}

/**
 * Request permission, register the FCM token with the backend, and wire up
 * delivery in every app state:
 *   • foreground → displayed via Notifee (FCM won't auto-show it)
 *   • background / quit → shown by the OS (notification payload) or the
 *     background handler in index.js (data-only payload)
 */
export async function setupNotifications(role: UserRole = 'CUSTOMER'): Promise<void> {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) return;

    await ensureChannel();

    // Register the FCM token against the correct account type.
    const updateFcm = role === 'DRIVER' ? driverApi.updateFcm : authApi.updateFcm;
    const token = await messaging().getToken();
    if (token) await updateFcm(token).catch(() => undefined);
    messaging().onTokenRefresh((t) => updateFcm(t).catch(() => undefined));

    // Foreground messages: FCM does not display these, so we show them ourselves.
    messaging().onMessage(async (msg) => {
      await displayNotification(
        msg.notification?.title,
        msg.notification?.body,
        (msg.data as Record<string, string>) ?? {},
      );
    });
  } catch {
    // Best-effort — never block the app.
  }
}
