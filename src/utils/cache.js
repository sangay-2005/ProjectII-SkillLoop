import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Saves data on the phone so it can be viewed without internet
export const saveCache = async (key, data) => {
  try {
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(data));
  } catch (error) {
    console.log('Could not save cache:', error.message);
  }
};

// Returns the saved copy, or null if there isn't one
export const loadCache = async (key) => {
  try {
    const text = await AsyncStorage.getItem(`cache_${key}`);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.log('Could not read cache:', error.message);
    return null;
  }
};

// true if the phone is connected to the internet right now
export const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected !== false && state.isInternetReachable !== false;
};

// Online: load fresh data and save a copy of it.
// Offline (or if loading fails): return the saved copy instead.
// fetchFresh is a function that loads the data from Firestore and returns it.
export const loadWithCache = async (key, fetchFresh) => {
  if (await isOnline()) {
    try {
      const fresh = await fetchFresh();
      await saveCache(key, fresh);
      return fresh;
    } catch (error) {
      console.log('Load failed, using saved copy:', error.message);
    }
  }
  return loadCache(key);
};