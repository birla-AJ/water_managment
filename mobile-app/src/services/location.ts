import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
    title: 'Delivery location',
    message: 'WaterFlow uses your location to save the delivery point and calculate live ETA during active deliveries.',
    buttonPositive: 'Allow',
    buttonNegative: 'Cancel',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function getCurrentLocation(): Promise<DeviceLocation> {
  const allowed = await requestLocationPermission();
  if (!allowed) {
    Alert.alert('Location permission needed', 'Please allow location permission to save your delivery point and show accurate tracking.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
    throw new Error('Location permission denied');
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { coords } = position;
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.speed ?? undefined,
          heading: coords.heading ?? undefined,
        });
      },
      (err) => reject(new Error(err.message ?? 'Could not read current location')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 8000 },
    );
  });
}
