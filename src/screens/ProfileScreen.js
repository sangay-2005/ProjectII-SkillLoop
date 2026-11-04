import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import ScreenHeader from '../components/ScreenHeader';
import Avatar from '../components/Avatar';
import { ratingText } from '../utils/rating';
import { loadWithCache } from '../utils/cache';
import { useOnline, warnOffline } from '../utils/connection';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const online = useOnline();

  const loadProfile = async () => {
    const myUid = auth.currentUser.uid;

    // fresh from Firestore when online, the saved copy when offline
    const data = await loadWithCache(`${myUid}_profile`, async () => {
      const snap = await getDoc(doc(db, 'users', myUid));
      return snap.exists() ? snap.data() : null;
    });

    if (data) setProfile(data);
    setLoading(false);
  };

  // reload when the tab is opened, and again when the connection comes back
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [online])
  );

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  // editing needs the internet
  const handleEdit = () => {
    if (!online) {
      warnOffline();
      return;
    }
    navigation.navigate('EditProfile');
  };

  // one number in the stats row
  const stat = (value, label) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#E8A33D' }}>{value}</Text>
      <Text style={{ fontSize: 12, color: '#5F6368', marginTop: 2 }}>{label}</Text>
    </View>
  );

  // a list of skill chips
  const chips = (list, bg, fg) =>
    (list || []).map((skill) => (
      <View
        key={skill}
        style={{ backgroundColor: bg, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, marginRight: 8, marginBottom: 8 }}
      >
        <Text style={{ fontSize: 13, color: fg, fontWeight: '600' }}>{skill}</Text>
      </View>
    ));

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="My Profile" subtitle="How others see you on SkillLoop" />

      {loading ? (
        <ActivityIndicator size="large" color="#E8A33D" style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View
            style={{
              backgroundColor: '#fff', borderRadius: 24, padding: 20, alignItems: 'center',
              shadowColor: '#1F456D', shadowOpacity: 0.08, shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 }, elevation: 3,
            }}
          >
            <Avatar name={profile?.displayName || auth.currentUser?.email} size={76} />
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F456D', marginTop: 12 }}>
              {profile?.displayName || 'Your name'}
            </Text>
            <Text style={{ fontSize: 13, color: '#5F6368', marginTop: 2 }}>{auth.currentUser?.email}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Ionicons name="location-outline" size={14} color="#5F6368" />
              <Text style={{ fontSize: 13, color: '#5F6368', marginLeft: 3 }}>{profile?.location || 'Bhutan'}</Text>
            </View>
            {profile?.bio ? (
              <Text style={{ fontSize: 14, color: '#444', textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
                {profile.bio}
              </Text>
            ) : null}

            {/* edit button */}
            <TouchableOpacity
              onPress={handleEdit}
              style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E5F5',
                paddingVertical: 8, paddingHorizontal: 18, borderRadius: 16, marginTop: 14,
                opacity: online ? 1 : 0.5,
              }}
            >
              <Ionicons name="create-outline" size={16} color="#8E24AA" />
              <Text style={{ color: '#8E24AA', fontWeight: 'bold', marginLeft: 6 }}>Edit Profile</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', marginTop: 18, width: '100%' }}>
              {stat((profile?.skillsToTeach || []).length, 'Teaching')}
              {stat((profile?.skillsToLearn || []).length, 'Learning')}
              {stat(ratingText(profile), 'Rating')}
            </View>
          </View>

          <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1F456D', marginTop: 22, marginBottom: 10 }}>
            Skills I Teach
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {chips(profile?.skillsToTeach, '#E8F5E9', '#2D6A4F')}
          </View>

          <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1F456D', marginTop: 12, marginBottom: 10 }}>
            Skills I'm Learning
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {chips(profile?.skillsToLearn, '#FBF0DC', '#B7791F')}
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
              borderWidth: 1.5, borderColor: '#D62828', borderRadius: 14, padding: 14, marginTop: 28,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#D62828" />
            <Text style={{ color: '#D62828', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}