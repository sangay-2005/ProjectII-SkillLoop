// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAZEV6VRUBiMZ8iNmiJhgfA-0SCXvjPQ2c',
  authDomain: 'skillloop-bhutan.firebaseapp.com',
  projectId: 'skillloop-bhutan',
  storageBucket: 'skillloop-bhutan.firebasestorage.app',
  messagingSenderId: '780741656619',
  appId: '1:780741656619:web:db37b53928300f36d62a6e',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const db = getFirestore(app);