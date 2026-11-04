import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// true while the phone has internet; updates by itself when the connection drops or returns
export const useOnline = () => {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  return online;
};

// shown when someone tries to change something while offline
export const warnOffline = () => {
  Alert.alert(
    "You're offline",
    'Connect to the internet to make changes. You can still view your saved data.'
  );
};