import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import ScreenHeader from '../components/ScreenHeader';
import Avatar from '../components/Avatar';
import ProgressRing from '../components/ProgressRing';

export default function LearningJourneyScreen({ navigation }) {
  const [loops, setLoops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Loops where I am the learner: accepted requests that I sent
  const loadLoops = async () => {
    try {
      const myUid = auth.currentUser.uid;
      const snap = await getDocs(
        query(collection(db, 'requests'), where('senderId', '==', myUid), where('status', '==', 'accepted'))
      );

      // count the logged sessions of each Loop to work out its progress
      const result = await Promise.all(
        snap.docs.map(async (d) => {
          const sessions = await getDocs(collection(db, 'requests', d.id, 'progress'));
          return {
            ...d.data(),
            id: d.id,
            sessions: sessions.size,
            percent: Math.min(sessions.size * 10, 100), // 10 sessions = 100%
          };
        })
      );
      setLoops(result);
    } catch (error) {
      console.log('Error loading learning data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // reload whenever this tab is opened, so new sessions show straight away
  useFocusEffect(
    useCallback(() => {
      loadLoops();
    }, [])
  );

  const active = loops.filter((l) => l.percent < 100);
  const completed = loops.filter((l) => l.percent >= 100);

  const renderCard = (loop, isCompleted) => (
    <TouchableOpacity
      key={loop.id}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('LoopDetail', { requestId: loop.id })}
      style={{
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20,
        padding: 14, marginBottom: 12,
        shadowColor: '#1F456D', shadowOpacity: 0.08, shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }, elevation: 3,
      }}
    >
      <Avatar name={loop.receiverName} size={44} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F456D' }}>{loop.skillName}</Text>
        <Text style={{ fontSize: 13, color: '#5F6368', marginTop: 2 }}>With {loop.receiverName}</Text>
        <Text style={{ fontSize: 12, color: '#8D99AE', marginTop: 4 }}>
          {loop.sessions} {loop.sessions === 1 ? 'session' : 'sessions'} completed
        </Text>
      </View>
      {isCompleted ? (
        <Ionicons name="checkmark-circle" size={40} color="#2D6A4F" />
      ) : (
        <ProgressRing percent={loop.percent} size={56} strokeWidth={6} />
      )}
    </TouchableOpacity>
  );

  const sectionTitle = {
    fontSize: 17, fontWeight: 'bold', color: '#1F456D', marginTop: 8, marginBottom: 12,
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="My Learning Journey"
        subtitle={`${loops.length} ${loops.length === 1 ? 'Skill' : 'Skills'} I'm Learning`}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#E8A33D" style={{ marginTop: 30 }} />
      ) : loops.length === 0 ? (
        // nothing accepted yet
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Ionicons name="school-outline" size={56} color="#E8A33D" />
          <Text style={{ marginTop: 12, color: '#5F6368', textAlign: 'center', lineHeight: 20 }}>
            You are not learning any skill yet. Send a request to a mentor and it will appear here once they accept.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Discover')}
            style={{ marginTop: 18, backgroundColor: '#1F456D', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Find a mentor</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
          <Text style={sectionTitle}>Active Progress</Text>
          {active.length === 0 && (
            <Text style={{ color: '#8D99AE', marginBottom: 12 }}>Nothing in progress right now.</Text>
          )}
          {active.map((loop) => renderCard(loop, false))}

          {completed.length > 0 && (
            <>
              <Text style={[sectionTitle, { marginTop: 16 }]}>Completed Skills</Text>
              {completed.map((loop) => renderCard(loop, true))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}