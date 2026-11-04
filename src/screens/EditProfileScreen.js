import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import ProfileSetupScreen from './auth/ProfileSetupScreen';

// Loads the saved profile, then shows the setup form in "edit" mode
export default function EditProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    getDoc(doc(db, 'users', auth.currentUser.uid)).then((snap) => {
      setProfile(snap.exists() ? snap.data() : {});
    });
  }, []);

  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E8A33D" />
      </View>
    );
  }

  return <ProfileSetupScreen isEdit initial={profile} onDone={() => navigation.goBack()} />;
}