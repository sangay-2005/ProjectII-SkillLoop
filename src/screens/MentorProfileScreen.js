import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import Avatar from '../components/Avatar';

export default function MentorProfileScreen({ route }) {
  const { mentorId } = route.params;
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMentor();
  }, [mentorId]);

  const loadMentor = async () => {
    setLoading(true);
    try {
      const mentorSnap = await getDoc(doc(db, 'users', mentorId));
      if (mentorSnap.exists()) {
        const data = mentorSnap.data();
        setMentor(data);
        const firstSkill = data.skillsToTeach?.[0] || null;
        setSelectedSkill(firstSkill);
        checkExistingRequest(firstSkill);
      } else {
        Alert.alert('Not found', 'This mentor profile no longer exists.');
      }
    } catch (error) {
      console.log('Error loading mentor:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingRequest = async (skillName) => {
    if (!skillName) {
      setAlreadyRequested(false);
      return;
    }
    try {
      const q = query(
        collection(db, 'requests'),
        where('senderId', '==', auth.currentUser.uid),
        where('receiverId', '==', mentorId),
        where('skillName', '==', skillName)
      );
      const snapshot = await getDocs(q);
      const hasActive = snapshot.docs.some((d) => {
        const status = d.data().status;
        return status === 'pending' || status === 'accepted';
      });
      setAlreadyRequested(hasActive);
    } catch (error) {
      console.log('Error checking existing request:', error.message);
    }
  };

  const handleSelectSkill = (skill) => {
    setSelectedSkill(skill);
    checkExistingRequest(skill);
  };

  const handleRequestToExchange = async () => {
    if (!selectedSkill) {
      Alert.alert('Pick a skill', 'Please select a skill to learn first.');
      return;
    }
    setSending(true);
    try {
      const myUid = auth.currentUser.uid;
      const mySnap = await getDoc(doc(db, 'users', myUid));
      const myName = mySnap.exists() ? mySnap.data().displayName : auth.currentUser.email;

      const newRef = doc(collection(db, 'requests'));
      await setDoc(newRef, {
        id: newRef.id,
        senderId: myUid,
        senderName: myName,
        receiverId: mentorId,
        receiverName: mentor.displayName || '',
        skillName: selectedSkill,
        message: `I would love to learn ${selectedSkill} from you!`,
        status: 'pending',
        timestamp: Date.now(),
      });
      setAlreadyRequested(true);
      Alert.alert('Request sent', `Your request to learn ${selectedSkill} has been sent.`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E8A33D" />
      </View>
    );
  }

  if (!mentor) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#5F6368' }}>Mentor not found.</Text>
      </View>
    );
  }

  const rating = mentor.rating != null ? Number(mentor.rating).toFixed(1) : '-';

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* profile card */}
      <View style={[styles.card, { alignItems: 'center' }]}>
        <Avatar name={mentor.displayName} size={80} />
        <Text style={styles.name}>{mentor.displayName}</Text>
        <View style={styles.ratingPill}>
          <Ionicons name="star" size={13} color="#E8A33D" />
          <Text style={styles.ratingText}>{rating}</Text>
          <Text style={styles.reviewsText}>({mentor.reviewsCount || 0} reviews)</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Ionicons name="location-outline" size={14} color="#5F6368" />
          <Text style={styles.location}>{mentor.location || 'Bhutan'}</Text>
        </View>
      </View>

      {/* teaching details (static, like Project-I) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Teaching Details</Text>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color="#2D6A4F" />
          <Text style={styles.detailText}>Availability: Weekends</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={18} color="#2D6A4F" />
          <Text style={styles.detailText}>Format: In-person / Online</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color="#2D6A4F" />
          <Text style={styles.detailText}>Session length: 60 mins</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{mentor.bio || 'No bio provided.'}</Text>
      </View>

      {/* skills they teach: tap one to choose what to request */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Skills I Can Teach</Text>
        <Text style={styles.hint}>Tap the skill you want to learn</Text>
        <View style={styles.chipRow}>
          {(mentor.skillsToTeach || []).map((skill) => {
            const selected = selectedSkill === skill;
            const level = mentor.skillLevels?.[skill];
            return (
              <TouchableOpacity
                key={skill}
                onPress={() => handleSelectSkill(skill)}
                style={[styles.skillChip, selected && styles.skillChipActive]}
              >
                <Text style={[styles.skillChipText, selected && { color: '#fff' }]}>
                  {skill}{level ? ` · ${level}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Skills I Want to Learn</Text>
        <View style={styles.chipRow}>
          {(mentor.skillsToLearn || []).length === 0 && (
            <Text style={styles.bio}>Nothing listed yet.</Text>
          )}
          {(mentor.skillsToLearn || []).map((skill) => (
            <View key={skill} style={styles.learnChip}>
              <Text style={styles.learnChipText}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, (alreadyRequested || sending) && styles.buttonDisabled]}
        onPress={handleRequestToExchange}
        disabled={alreadyRequested || sending}
      >
        <Ionicons
          name={alreadyRequested ? 'checkmark-circle' : 'swap-horizontal'}
          size={20}
          color={alreadyRequested ? '#fff' : '#E8A33D'}
        />
        <Text style={styles.buttonText}>
          {alreadyRequested ? 'Requested' : sending ? 'Sending...' : 'Request to Exchange'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: '#1F456D', shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1F456D', marginTop: 12 },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBF0DC',
    paddingVertical: 4, paddingHorizontal: 12, borderRadius: 14, marginTop: 8,
  },
  ratingText: { fontSize: 14, fontWeight: 'bold', color: '#1F456D', marginLeft: 4 },
  reviewsText: { fontSize: 12, color: '#5F6368', marginLeft: 4 },
  location: { fontSize: 13, color: '#5F6368', marginLeft: 3 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1F456D', marginBottom: 10 },
  hint: { fontSize: 12, color: '#8D99AE', marginTop: -6, marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { fontSize: 14, color: '#1A1A1A', marginLeft: 10 },
  bio: { fontSize: 14, color: '#444', lineHeight: 21 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  skillChip: {
    borderWidth: 1.5, borderColor: '#2D6A4F', paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, marginRight: 8, marginBottom: 8,
  },
  skillChipActive: { backgroundColor: '#2D6A4F' },
  skillChipText: { fontSize: 13, fontWeight: '600', color: '#2D6A4F' },
  learnChip: {
    backgroundColor: '#F3E5F5', paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, marginRight: 8, marginBottom: 8,
  },
  learnChipText: { fontSize: 13, fontWeight: '600', color: '#8E24AA' },
  button: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1F456D', padding: 16, borderRadius: 14, marginTop: 6,
  },
  buttonDisabled: { backgroundColor: '#8D99AE' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
});