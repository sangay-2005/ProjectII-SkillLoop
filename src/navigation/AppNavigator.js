import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import MentorProfileScreen from '../screens/MentorProfileScreen';
import RequestsScreen from '../screens/RequestsScreen';
import ChatScreen from '../screens/ChatScreen';
import LearningJourneyScreen from '../screens/LearningJourneyScreen';
import LoopDetailScreen from '../screens/LoopDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// cream background behind every screen
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FAF7F0',
    primary: '#C97C1F',
    card: '#1F456D',
    text: '#FAF7F0',
    border: '#1F456D',
  },
};

// [filled icon, outline icon] for each tab
const TAB_ICONS = {
  Home: ['home', 'home-outline'],
  Discover: ['compass', 'compass-outline'],
  Requests: ['swap-horizontal', 'swap-horizontal-outline'],
  Learning: ['school', 'school-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#E8A33D',
        tabBarInactiveTintColor: '#8FA3B8',
        tabBarStyle: {
          backgroundColor: '#1F456D',
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={24} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Learning" component={LearningJourneyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          console.log(
            'uid:', currentUser.uid,
            '| doc exists:', snap.exists(),
            '| profileCompleted:', snap.data()?.profileCompleted
          );
          setHasProfile(snap.exists() && snap.data().profileCompleted === true);
        } catch (error) {
          console.log('Profile check failed:', error.message);
          setHasProfile(false);
        }
      } else {
        setHasProfile(false);
      }
      setUser(currentUser);
      setCheckingAuth(false);
    });
    return unsubscribe;
  }, []);

  if (checkingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF7F0' }}>
        <ActivityIndicator size="large" color="#C97C1F" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={AppTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1F456D' },
          headerTintColor: '#FAF7F0',
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false,
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
          </>
        ) : !hasProfile ? (
          <Stack.Screen
            name="ProfileSetup"
            options={{ title: 'Set Up Your Profile', headerBackVisible: false }}
          >
            {() => <ProfileSetupScreen onDone={() => setHasProfile(true)} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="MentorProfile" component={MentorProfileScreen} options={{ title: 'Mentor Profile' }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
            <Stack.Screen name="LoopDetail" component={LoopDetailScreen} options={{ title: 'My Loop' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}