import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import ScreenHeader from '../components/ScreenHeader';
import Avatar from '../components/Avatar';

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) setProfile(snap.data());
    } catch (error) {
      console.log('Error loading profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

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

  const stat = (value, label) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#C97C1F' }}>{value}</Text>
      <Text style={{ fontSize: 12, color: '#7A7468', marginTop: 2 }}>{label}</Text>
    </View>
  );

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
        <ActivityIndicator size="large" color="#C97C1F" style={{ marginTop: 30 }} />
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
            <Text style={{ fontSize: 13, color: '#7A7468', marginTop: 2 }}>{auth.currentUser?.email}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Ionicons name="location-outline" size={14} color="#7A7468" />
              <Text style={{ fontSize: 13, color: '#7A7468', marginLeft: 3 }}>{profile?.location || 'Bhutan'}</Text>
            </View>
            {profile?.bio ? (
              <Text style={{ fontSize: 14, color: '#444', textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
                {profile.bio}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', marginTop: 18, width: '100%' }}>
              {stat((profile?.skillsToTeach || []).length, 'Teaching')}
              {stat((profile?.skillsToLearn || []).length, 'Learning')}
              {stat(profile?.rating != null ? Number(profile.rating).toFixed(1) : '-', 'Rating')}
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
            {chips(profile?.skillsToLearn, '#FBF0DC', '#C97C1F')}
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
              borderWidth: 1.5, borderColor: '#B3261E', borderRadius: 14, padding: 14, marginTop: 28,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#B3261E" />
            <Text style={{ color: '#B3261E', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}