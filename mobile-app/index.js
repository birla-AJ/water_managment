import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Background / quit-state messages. Notification-payload messages are shown by
// the OS automatically; data-only messages are displayed here via Notifee.
messaging().setBackgroundMessageHandler(async (msg) => {
  if (!msg.notification && (msg.data?.title || msg.data?.body)) {
    await notifee.createChannel({ id: 'default', name: 'General', importance: AndroidImportance.HIGH });
    await notifee.displayNotification({
      title: msg.data?.title ?? 'WaterFlow',
      body: msg.data?.body ?? '',
      android: { channelId: 'default', smallIcon: 'ic_launcher', pressAction: { id: 'default' } },
    });
  }
});

AppRegistry.registerComponent(appName, () => App);
