
import { useState, useEffect, createContext, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { loadWithCache } from '../utils/cache';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import MentorProfileScreen from '../screens/MentorProfileScreen';
import RequestsScreen from '../screens/RequestsScreen';
import ChatScreen from '../screens/ChatScreen';
import ChatListScreen from '../screens/ChatListScreen';
import LearningJourneyScreen from '../screens/LearningJourneyScreen';
import LoopDetailScreen from '../screens/LoopDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

import ScheduleSessionScreen from '../screens/ScheduleSessionScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';

import useLiveNotifications from '../hooks/useLiveNotifications';
import useBadgeCounts from '../hooks/useBadgeCounts';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Lets notification code open screens from outside the navigator.
const navigationRef = createNavigationContainerRef();

// Numbers shown on Requests and Messages tabs.
const BadgeContext = createContext({ pending: 0, unread: 0 });

const badgeText = (n) => (n > 9 ? '9+' : n);

// App theme.
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FAF7F0',
    primary: '#E8A33D',
    card: '#1F456D',
    text: '#FAF7F0',
    border: '#1F456D',
  },
};

// Filled and outline icons for each tab.
const TAB_ICONS = {
  Home: ['home', 'home-outline'],
  Discover: ['compass', 'compass-outline'],
  Requests: ['swap-horizontal', 'swap-horizontal-outline'],
  Messages: ['chatbubbles', 'chatbubbles-outline'],
  Learning: ['school', 'school-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { pending, unread } = useContext(BadgeContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#E8A33D',
        tabBarInactiveTintColor: '#8FA3B8',

        tabBarStyle: {
          backgroundColor: '#1F456D',
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },

        tabBarBadgeStyle: {
          backgroundColor: '#E8A33D',
          color: '#1F456D',
          fontSize: 11,
          fontWeight: 'bold',
        },

        tabBarIcon: ({ focused, color }) => (
          <Ionicons
            name={TAB_ICONS[route.name][focused ? 0 : 1]}
            size={24}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />

      <Tab.Screen name="Discover" component={DiscoverScreen} />

      <Tab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{
          tabBarBadge: pending > 0 ? badgeText(pending) : undefined,
        }}
      />

      <Tab.Screen
        name="Messages"
        component={ChatListScreen}
        options={{
          tabBarBadge: unread > 0 ? badgeText(unread) : undefined,
          headerShown: true,
          title: 'Messages',
          headerStyle: { backgroundColor: '#1F456D' },
          headerTintColor: '#FAF7F0',
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false,
        }}
      />

      <Tab.Screen
        name="Learning"
        component={LearningJourneyScreen}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);

  // Live notifications.
  useLiveNotifications(
    navigationRef,
    !!user && hasProfile
  );

  // Tab badges and unread messages.
  const badges = useBadgeCounts(
    !!user && hasProfile,
    activeChatId
  );

  // Remember which chat is currently open.
  const updateActiveChat = () => {
    const route = navigationRef.isReady()
      ? navigationRef.getCurrentRoute()
      : null;

    setActiveChatId(
      route?.name === 'Chat'
        ? route.params?.requestId || null
        : null
    );
  };

  // Authentication and profile checking.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          const completed = await loadWithCache(
            `${currentUser.uid}_hasProfile`,
            async () => {
              const snap = await getDoc(
                doc(db, 'users', currentUser.uid)
              );

              return (
                snap.exists() &&
                snap.data().profileCompleted === true
              );
            }
          );

          setHasProfile(completed === true);
        } else {
          setHasProfile(false);
        }

        setUser(currentUser);
        setCheckingAuth(false);
      }
    );

    return unsubscribe;
  }, []);

  // Loading screen.
  if (checkingAuth) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FAF7F0',
        }}
      >
        <ActivityIndicator
          size="large"
          color="#E8A33D"
        />
      </View>
    );
  }

  return (
    <BadgeContext.Provider value={badges}>
      <NavigationContainer
        ref={navigationRef}
        theme={AppTheme}
        onReady={updateActiveChat}
        onStateChange={updateActiveChat}
      >
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1F456D',
            },

            headerTintColor: '#FAF7F0',

            headerTitleStyle: {
              fontWeight: 'bold',
            },

            headerShadowVisible: false,

            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          {!user ? (
            <>
              <Stack.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="Signup"
                component={SignupScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : !hasProfile ? (
            <Stack.Screen
              name="ProfileSetup"
              options={{
                title: 'Set Up Your Profile',
                headerBackVisible: false,
              }}
            >
              {() => (
                <ProfileSetupScreen
                  onDone={() => setHasProfile(true)}
                />
              )}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen
                name="MainTabs"
                component={MainTabs}
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="MentorProfile"
                component={MentorProfileScreen}
                options={{ title: 'Mentor Profile' }}
              />

              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={({ route }) => ({
                  title: route.params?.partnerName || 'Chat',
                })}
              />

              <Stack.Screen
                name="ChatList"
                component={ChatListScreen}
                options={{ title: 'Messages' }}
              />

              <Stack.Screen
                name="LoopDetail"
                component={LoopDetailScreen}
                options={{ title: 'My Loop' }}
              />

              <Stack.Screen
                name="ScheduleSession"
                component={ScheduleSessionScreen}
                options={{ title: 'Schedule Session' }}
              />

              {/* New: Session Details and Actions */}
              <Stack.Screen
                name="SessionDetail"
                component={SessionDetailScreen}
                options={{ title: 'Session Details' }}
              />

              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ title: 'Edit Profile' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </BadgeContext.Provider>
  );
}
