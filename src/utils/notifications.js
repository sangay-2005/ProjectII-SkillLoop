
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';

// Avoid duplicate banners when a remote notification arrives in the foreground.
// Local notifications from the app can still display.
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

// Creates the Android channel and requests notification permission.
export const setupNotifications = async () => {
  try {
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
  } catch (error) {
    console.log('[push] Permission setup failed:', error.message);
    return false;
  }
};

// Registers this phone's Expo push token for the logged-in account.
export const registerPushToken = async (uid) => {
  try {
    if (!uid) {
      console.log('[push] Registration skipped: missing user ID.');
      return null;
    }

    if (!Device.isDevice) {
      console.log('[push] Registration skipped: physical device required.');
      return null;
    }

    const permission = await Notifications.getPermissionsAsync();

    if (permission.status !== 'granted') {
      console.log('[push] Registration skipped: notification permission not granted.');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log('[push] Registration failed: EAS project ID not found.');
      return null;
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenResult.data;

    if (!token) {
      console.log('[push] Registration failed: Expo returned no token.');
      return null;
    }

    await updateDoc(doc(db, 'users', uid), {
      expoPushToken: token,
    });

    console.log('[push] Token registered for account:', uid);
    return token;
  } catch (error) {
    console.log('[push] Token registration failed:', error.message);
    return null;
  }
};

// Removes this phone's token from the account being logged out.
// This prevents the previous account from retaining this device's token.
export const unregisterPushToken = async (uid) => {
  try {
    if (!uid) return;

    await updateDoc(doc(db, 'users', uid), {
      expoPushToken: deleteField(),
    });

    console.log('[push] Token removed for account:', uid);
  } catch (error) {
    console.log('[push] Token removal failed:', error.message);
  }
};

// Displays a local notification on this phone.
export const showLocalNotification = (title, body, data = {}) =>
  Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger:
      Platform.OS === 'android'
        ? { channelId: 'default' }
        : null,
  });

// Sends a push notification through Expo and checks its response.
export const sendPush = async (toUid, title, body, data = {}) => {
  try {
    if (!toUid) {
      console.log('[push] Send skipped: missing recipient ID.');
      return;
    }

    const snap = await getDoc(doc(db, 'users', toUid));
    const token = snap.exists() ? snap.data().expoPushToken : null;

    console.log('[push] Recipient has token:', !!token);

    if (!token) {
      console.log('[push] Send skipped: recipient has no registered token.');
      return;
    }

    if (
      typeof token !== 'string' ||
      (!token.startsWith('ExponentPushToken[') &&
        !token.startsWith('ExpoPushToken['))
    ) {
      console.log('[push] Send skipped: recipient token format is invalid.');
      return;
    }

    const response = await fetch(
      'https://exp.host/--/api/v2/push/send',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          title,
          body,
          data,
          sound: 'default',
          channelId: 'default',
        }),
      }
    );

    const result = await response.json();

    console.log('[push] HTTP status:', response.status);
    console.log('[push] Expo response:', JSON.stringify(result));

    if (!response.ok) {
      console.log('[push] Expo request failed.');
      return;
    }

    const ticket = Array.isArray(result.data)
      ? result.data[0]
      : result.data;

    if (ticket?.status === 'error') {
      console.log('[push] Expo rejected notification:', ticket.message);
      console.log('[push] Expo error details:', JSON.stringify(ticket.details || {}));
      return;
    }

    if (!ticket?.id) {
      console.log('[push] No delivery ticket ID returned by Expo.');
      return;
    }

    console.log('[push] Notification ticket received:', ticket.id);

    // Check the delivery receipt after Expo has had time to process it.
    setTimeout(async () => {
      try {
        const receiptResponse = await fetch(
          'https://exp.host/--/api/v2/push/getReceipts',
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ids: [ticket.id],
            }),
          }
        );

        const receiptResult = await receiptResponse.json();

        console.log('[push] Receipt HTTP status:', receiptResponse.status);
        console.log('[push] Receipt result:', JSON.stringify(receiptResult));
      } catch (error) {
        console.log('[push] Receipt check failed:', error.message);
      }
    }, 20000);
  } catch (error) {
    console.log('[push] Send failed:', error.message);
  }
};
