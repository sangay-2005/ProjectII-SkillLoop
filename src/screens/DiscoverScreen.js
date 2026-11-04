import { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import ScreenHeader from '../components/ScreenHeader';
import CategoryChips from '../components/CategoryChips';
import MentorCard from '../components/MentorCard';
import { loadWithCache } from '../utils/cache';
import { useOnline } from '../utils/connection';

export default function DiscoverScreen({ navigation }) {
  const [allMentors, setAllMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const online = useOnline();

  const loadMentors = async () => {
    setLoading(true);
    const myUid = auth.currentUser?.uid;

    // fresh from Firestore when online, the saved copy when offline
    const others = await loadWithCache(`${myUid}_discover`, async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const list = [];
      snapshot.forEach((d) => {
        if (d.id !== myUid) list.push({ id: d.id, ...d.data() });
      });
      return list;
    });

    if (others) setAllMentors(others);
    setLoading(false);
  };

  // reload when the tab is opened, and again when the connection comes back
  useFocusEffect(
    useCallback(() => {
      loadMentors();
    }, [online])
  );

  const categories = ['All', ...new Set(allMentors.map((m) => m.category).filter(Boolean))];
  const shown = allMentors.filter((m) => activeCategory === 'All' || m.category === activeCategory);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Discover" subtitle="Find a mentor for any skill" />

      <View style={{ marginTop: 16 }}>
        <CategoryChips categories={categories} active={activeCategory} onSelect={setActiveCategory} />
      </View>

      <Text style={{ fontSize: 13, color: '#7A7468', marginHorizontal: 20, marginTop: 14, marginBottom: 10 }}>
        {shown.length} {shown.length === 1 ? 'mentor' : 'mentors'} available
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#E8A33D" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <MentorCard
              mentor={item}
              onPress={() => navigation.navigate('MentorProfile', { mentorId: item.id })}
            />
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#7A7468', marginTop: 20 }}>
              No mentors in this category yet.
            </Text>
          }
        />
      )}
    </View>
  );
}