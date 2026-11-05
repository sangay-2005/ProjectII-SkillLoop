import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// How notifications behave while the app is open.
// Pushes from the push service are hidden here, because while the app is open
// the live listeners show their own banner (so you never see two).
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isRemote = notification.request.trigger?.type === 'push';
    return {
      shouldShowBanner: !isRemote,
      shouldShowList: !isRemote,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

// Creates the Android channel, asks for permission, and returns true if allowed
export const setupNotifications = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SkillLoop',
      importance: Notifications.AndroidImportance.MAX,
      lightColor: '#E8A33D',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  return status === 'granted';
};

// Gets this phone's push token and saves it on the user's profile,
// so other users' actions can send this phone a push
export const registerPushToken = async (uid) => {
  try {
    if (!Device.isDevice) return; // emulators can't receive pushes

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await updateDoc(doc(db, 'users', uid), { expoPushToken: tokenResult.data });
  } catch (error) {
    // normal in Expo Go on Android, or before an EAS project exists
    console.log('Push token not available:', error.message);
  }
};

// Shows a notification on this phone straight away
export const showLocalNotification = (title, body, data = {}) =>
  Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: Platform.OS === 'android' ? { channelId: 'default' } : null,
  });

// Sends a push to another user through Expo's push service.
// No server is needed: the app posts the message itself.
export const sendPush = async (toUid, title, body, data = {}) => {
  try {
    const snap = await getDoc(doc(db, 'users', toUid));
    const token = snap.exists() ? snap.data().expoPushToken : null;
    if (!token) return; // that user has no push token yet

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, data, sound: 'default', channelId: 'default' }),
    });
  } catch (error) {
    console.log('Push not sent:', error.message);
  }
};