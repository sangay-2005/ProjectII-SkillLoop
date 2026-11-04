
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import ProgressRing from '../components/ProgressRing';
import Avatar from '../components/Avatar';
import ReviewCard from '../components/ReviewCard';
import { loadWithCache, loadCache, saveCache } from '../utils/cache';
import { useOnline, warnOffline } from '../utils/connection';

// the checklist stages, and the progress % needed to tick each one
const MILESTONES = [
  { label: 'Basics of Skill', needed: 10 },
  { label: 'Intermediate Level Mastery', needed: 50 },
  { label: 'Final Project Completion', needed: 100 },
];

// counts how many days in a row (ending today or yesterday) have at least one session
const calculateStreak = (entries) => {
  const days = new Set(
    entries.map((e) => new Date(e.timestamp).toDateString())
  );

  let streak = 0;
  const day = new Date();

  if (!days.has(day.toDateString())) {
    day.setDate(day.getDate() - 1);
  }

  while (days.has(day.toDateString())) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }

  return streak;
};

const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function LoopDetailScreen({ route, navigation }) {
  const { requestId } = route.params;
  const myUid = auth.currentUser.uid;
  const online = useOnline();

  const [loop, setLoop] = useState(null);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // add / edit dialog
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // load the Loop details and the partner's email
  // (the saved copy when offline)
  useEffect(() => {
    const loadLoop = async () => {
      const data = await loadWithCache(
        `${myUid}_loop_${requestId}`,
        async () => {
          const snap = await getDoc(doc(db, 'requests', requestId));

          if (!snap.exists()) return null;

          const loopData = snap.data();

          const partnerId =
            loopData.senderId === myUid
              ? loopData.receiverId
              : loopData.senderId;

          const partnerSnap = await getDoc(
            doc(db, 'users', partnerId)
          );

          return {
            loop: loopData,
            partnerEmail: partnerSnap.exists()
              ? partnerSnap.data().email || ''
              : '',
          };
        }
      );

      if (!data) {
        Alert.alert(
          'Not available',
          'This Loop could not be loaded. Check your connection and try again.'
        );

        navigation.goBack();
        return;
      }

      setLoop(data.loop);
      setPartnerEmail(data.partnerEmail);

      const name =
        data.loop.senderId === myUid
          ? data.loop.receiverName
          : data.loop.senderName;

      navigation.setOptions({
        title: `Loop with ${name}`,
      });
    };

    loadLoop();
  }, [requestId, online]);

  // journal: real-time listener when online,
  // the saved copy when offline
  useEffect(() => {
    const entriesKey = `${myUid}_entries_${requestId}`;

    if (!online) {
      loadCache(entriesKey).then((saved) => {
        if (saved) setEntries(saved);
        setLoading(false);
      });

      return undefined;
    }

    const q = query(
      collection(db, 'requests', requestId, 'progress'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        }));

        setEntries(list);
        saveCache(entriesKey, list);
        setLoading(false);
      },
      (error) => {
        console.log('Journal listener error:', error.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [requestId, online]);

  const iAmMentor = loop?.receiverId === myUid;

  const partnerName = loop
    ? loop.senderId === myUid
      ? loop.receiverName
      : loop.senderName
    : '';

  const sessionCount = entries.length;
  const percent = Math.min(sessionCount * 10, 100);
  const streak = calculateStreak(entries);

  const openAdd = () => {
    if (!online) {
      warnOffline();
      return;
    }

    setEditing(null);
    setTitle('');
    setDescription('');
    setModalVisible(true);
  };

  const openEdit = (entry) => {
    if (!online) {
      warnOffline();
      return;
    }

    setEditing(entry);
    setTitle(entry.title);
    setDescription(entry.description);
    setModalVisible(true);
  };

  const saveEntry = async () => {
    if (!online) {
      warnOffline();
      return;
    }

    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing info', 'Please fill in both fields.');
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        // update an existing entry
        await updateDoc(
          doc(db, 'requests', requestId, 'progress', editing.id),
          {
            title: title.trim(),
            description: description.trim(),
          }
        );
      } else {
        // create a new entry
        const ref = doc(
          collection(db, 'requests', requestId, 'progress')
        );

        await setDoc(ref, {
          id: ref.id,
          connectionId: requestId,
          title: title.trim(),
          description: description.trim(),
          timestamp: Date.now(),
        });
      }

      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (entry) => {
    if (!online) {
      warnOffline();
      return;
    }

    Alert.alert(
      'Delete Log?',
      'Are you sure you want to delete this session entry?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, 'requests', requestId, 'progress', entry.id)
              );
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // everything above the journal list: summary card, milestones and review
  const header = (
    <View>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ProgressRing
            percent={percent}
            size={88}
            strokeWidth={9}
          />

          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.bigText}>
              {sessionCount}{' '}
              {sessionCount === 1 ? 'session' : 'sessions'} completed
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 6,
              }}
            >
              <Ionicons name="flame" size={16} color="#E8A33D" />
              <Text style={styles.streakText}>
                {streak} day streak
              </Text>
            </View>

            {loop && (
              <View style={styles.rolePill}>
                <Ionicons
                  name={
                    iAmMentor
                      ? 'easel-outline'
                      : 'school-outline'
                  }
                  size={13}
                  color="#2D6A4F"
                />

                <Text style={styles.roleText}>
                  {iAmMentor ? 'Teaching' : 'Learning'}{' '}
                  {loop.skillName}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* partner + message button */}
        {loop && (
          <View style={styles.partnerRow}>
            <Avatar name={partnerName} size={36} />

            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text
                style={{
                  fontWeight: 'bold',
                  color: '#1F456D',
                }}
              >
                {partnerName}
              </Text>

              <Text
                style={{
                  fontSize: 12,
                  color: '#5F6368',
                }}
              >
                {partnerEmail || 'Email unavailable'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.messageButton}
              onPress={() =>
                navigation.navigate('Chat', {
                  requestId,
                  partnerName,
                })
              }
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color="#1F456D"
              />

              <Text style={styles.messageText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Learning Milestones
        </Text>

        {MILESTONES.map((m) => {
          const done = percent >= m.needed;

          return (
            <View
              key={m.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Ionicons
                name={done ? 'checkbox' : 'square-outline'}
                size={22}
                color={done ? '#2D6A4F' : '#8D99AE'}
              />

              <Text
                style={{
                  marginLeft: 10,
                  fontSize: 14,
                  color: done ? '#1A1A1A' : '#8D99AE',
                }}
              >
                {m.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* learners can rate their mentor */}
      {loop && !iAmMentor && (
        <ReviewCard
          loop={loop}
          requestId={requestId}
          sessionCount={sessionCount}
        />
      )}

      <Text
        style={[
          styles.sectionTitle,
          { marginLeft: 20, marginBottom: 10 },
        ]}
      >
        Practice Journal
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 100,
        }}
        renderItem={({ item }) => (
          <View style={styles.entryCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryTitle}>
                {item.title}
              </Text>

              <Text style={styles.entryDate}>
                {formatDate(item.timestamp)}
              </Text>

              <Text style={styles.entryDesc}>
                {item.description}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => openEdit(item)}
              style={styles.iconButton}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color="#1F456D"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              style={styles.iconButton}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color="#D62828"
              />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color="#E8A33D"
              style={{ marginTop: 20 }}
            />
          ) : (
            <View
              style={{
                alignItems: 'center',
                padding: 30,
              }}
            >
              <Ionicons
                name="journal-outline"
                size={44}
                color="#E8A33D"
              />

              <Text
                style={{
                  color: '#5F6368',
                  textAlign: 'center',
                  marginTop: 10,
                  lineHeight: 20,
                }}
              >
                No sessions logged yet. After you meet your
                partner, tap + to record what you covered.
              </Text>
            </View>
          )
        }
      />

      {/* add session button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openAdd}
      >
        <Ionicons name="add" size={30} color="#1F456D" />
      </TouchableOpacity>

      {/* add / edit dialog */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editing
                ? 'Edit Session'
                : iAmMentor
                  ? 'Log Teaching Session'
                  : 'Log Learning Session'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Session Title"
              placeholderTextColor="#8D99AE"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[
                styles.input,
                { height: 90, textAlignVertical: 'top' },
              ]}
              placeholder={
                iAmMentor
                  ? 'What did you teach today?'
                  : 'What did you learn today?'
              }
              placeholderTextColor="#8D99AE"
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCancel}
              >
                <Text
                  style={{
                    color: '#5F6368',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveEntry}
                disabled={saving}
                style={styles.modalSave}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontWeight: 'bold',
                  }}
                >
                  {saving
                    ? 'Saving...'
                    : editing
                      ? 'Update'
                      : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 14,
    shadowColor: '#1F456D',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  bigText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F456D',
  },

  streakText: {
    fontSize: 13,
    color: '#B7791F',
    fontWeight: '600',
    marginLeft: 4,
  },

  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 8,
  },

  roleText: {
    fontSize: 12,
    color: '#2D6A4F',
    fontWeight: '600',
    marginLeft: 4,
  },

  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EFE7D6',
  },

  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1F456D',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  messageText: {
    color: '#1F456D',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F456D',
    marginBottom: 12,
  },

  entryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 10,
    shadowColor: '#1F456D',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  entryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F456D',
  },

  entryDate: {
    fontSize: 11,
    color: '#8D99AE',
    marginTop: 2,
  },

  entryDesc: {
    fontSize: 13,
    color: '#444',
    marginTop: 6,
    lineHeight: 19,
  },

  iconButton: {
    padding: 6,
    marginLeft: 2,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E8A33D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },

  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F456D',
    marginBottom: 14,
  },

  input: {
    backgroundColor: '#FAF7F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 10,
  },

  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  modalSave: {
    backgroundColor: '#1F456D',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
});
