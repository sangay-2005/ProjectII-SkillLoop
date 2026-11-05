
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
import {
  loadWithCache,
  loadCache,
  saveCache,
} from '../utils/cache';
import { useOnline, warnOffline } from '../utils/connection';

const MILESTONES = [
  { label: 'Basics of Skill', needed: 10 },
  { label: 'Intermediate Level Mastery', needed: 50 },
  { label: 'Final Project Completion', needed: 100 },
];

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

const formatSessionDate = (dateString) => {
  if (!dateString) return 'Date unavailable';

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed':
      return '#2D6A4F';
    case 'pending':
      return '#B7791F';
    case 'completed':
      return '#1F456D';
    case 'cancelled':
    case 'declined':
      return '#D62828';
    default:
      return '#5F6368';
  }
};

export default function LoopDetailScreen({ route, navigation }) {
  const { requestId } = route.params;
  const myUid = auth.currentUser.uid;
  const online = useOnline();

  const [loop, setLoop] = useState(null);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [entries, setEntries] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Load Loop details and partner email.
  useEffect(() => {
    let active = true;

    const loadLoop = async () => {
      const data = await loadWithCache(
        `${myUid}_loop_${requestId}`,
        async () => {
          const snap = await getDoc(
            doc(db, 'requests', requestId)
          );

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

      if (!active) return;

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

    return () => {
      active = false;
    };
  }, [requestId, online]);

  // Practice Journal listener and offline cache.
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
      async (error) => {
        console.log('Journal listener error:', error.message);

        const saved = await loadCache(entriesKey);
        if (saved) setEntries(saved);

        setLoading(false);
      }
    );

    return unsubscribe;
  }, [requestId, online]);

  // Scheduled Teaching Sessions listener and offline cache.
  useEffect(() => {
    const sessionsKey = `${myUid}_sessions_${requestId}`;

    if (!online) {
      loadCache(sessionsKey).then((saved) => {
        if (saved) setSessions(saved);
        setSessionsLoading(false);
      });

      return undefined;
    }

    const sessionsRef = collection(
      db,
      'requests',
      requestId,
      'sessions'
    );

    const unsubscribe = onSnapshot(
      sessionsRef,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        }));

        list.sort((a, b) => {
          const dateA = `${a.sessionDate || ''} ${a.startTime || ''}`;
          const dateB = `${b.sessionDate || ''} ${b.startTime || ''}`;
          return dateA.localeCompare(dateB);
        });

        setSessions(list);
        saveCache(sessionsKey, list);
        setSessionsLoading(false);
      },
      async (error) => {
        console.log('Sessions listener error:', error.message);

        const saved = await loadCache(sessionsKey);
        if (saved) setSessions(saved);

        setSessionsLoading(false);
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

  const journalTitle = iAmMentor
    ? 'Teaching Journal'
    : 'Learning Journal';

  const activityTitle = iAmMentor
    ? 'Teaching sessions completed'
    : 'Learning sessions completed';

  const openSchedule = () => {
    if (!online) {
      warnOffline();
      return;
    }

    navigation.navigate('ScheduleSession', {
      requestId,
    });
  };

  // Open the selected scheduled session.
  const openSessionDetail = (session) => {
    navigation.navigate('SessionDetail', {
      requestId,
      sessionId: session.id,
    });
  };

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
        await updateDoc(
          doc(db, 'requests', requestId, 'progress', editing.id),
          {
            title: title.trim(),
            description: description.trim(),
          }
        );
      } else {
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
      'Are you sure you want to delete this journal entry?',
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

  // Header containing journey, milestones, sessions and review.
  const header = (
    <View>
      {/* Journey summary */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {iAmMentor ? (
            <View style={styles.mentorIcon}>
              <Ionicons
                name="easel-outline"
                size={38}
                color="#2D6A4F"
              />
            </View>
          ) : (
            <ProgressRing
              percent={percent}
              size={88}
              strokeWidth={9}
            />
          )}

          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.bigText}>
              {sessionCount} {activityTitle}
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
                  name={iAmMentor ? 'easel-outline' : 'school-outline'}
                  size={13}
                  color="#2D6A4F"
                />

                <Text style={styles.roleText}>
                  {iAmMentor ? 'Teaching' : 'Learning'} {loop.skillName}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Partner and message button */}
        {loop && (
          <View style={styles.partnerRow}>
            <Avatar name={partnerName} size={36} />

            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.partnerName}>
                {partnerName}
              </Text>

              <Text style={styles.partnerEmail}>
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

      {/* Learning milestones: learners only */}
      {!iAmMentor && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Learning Milestones
          </Text>

          {MILESTONES.map((m) => {
            const done = percent >= m.needed;

            return (
              <View
                key={m.label}
                style={styles.milestoneRow}
              >
                <Ionicons
                  name={done ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={done ? '#2D6A4F' : '#8D99AE'}
                />

                <Text
                  style={[
                    styles.milestoneText,
                    { color: done ? '#1A1A1A' : '#8D99AE' },
                  ]}
                >
                  {m.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Learners can review their mentor */}
      {loop && !iAmMentor && (
        <ReviewCard
          loop={loop}
          requestId={requestId}
          sessionCount={sessionCount}
        />
      )}

      {/* Scheduled Teaching Sessions */}
      <View style={styles.card}>
        <View style={styles.sessionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>
              Teaching Sessions
            </Text>

            <Text style={styles.sessionSubtitle}>
              Plan and manage your meetings
            </Text>
          </View>

          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={openSchedule}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.scheduleButtonText}>
              Schedule
            </Text>
          </TouchableOpacity>
        </View>

        {sessionsLoading ? (
          <ActivityIndicator
            size="small"
            color="#E8A33D"
            style={{ marginTop: 15 }}
          />
        ) : sessions.length === 0 ? (
          <View style={styles.emptySessions}>
            <Ionicons
              name="calendar-outline"
              size={32}
              color="#E8A33D"
            />

            <Text style={styles.emptySessionText}>
              No teaching sessions scheduled yet.
            </Text>

            <Text style={styles.emptySessionHint}>
              Schedule a session with your Loop partner.
            </Text>
          </View>
        ) : (
          sessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={styles.sessionCard}
              activeOpacity={0.75}
              onPress={() => openSessionDetail(session)}
            >
              <View style={styles.sessionTopRow}>
                <Text style={styles.sessionTitle}>
                  {session.topic || 'Teaching Session'}
                </Text>

                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        `${getStatusColor(session.status)}18`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(session.status) },
                    ]}
                  >
                    {session.status || 'pending'}
                  </Text>
                </View>
              </View>

              <View style={styles.sessionInfoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color="#5F6368"
                />
                <Text style={styles.sessionInfo}>
                  {formatSessionDate(session.sessionDate)}
                </Text>
              </View>

              <View style={styles.sessionInfoRow}>
                <Ionicons
                  name="time-outline"
                  size={15}
                  color="#5F6368"
                />
                <Text style={styles.sessionInfo}>
                  {session.startTime || 'Time unavailable'}
                  {'  •  '}
                  {session.durationMinutes || 0} minutes
                </Text>
              </View>

              <View style={styles.sessionInfoRow}>
                <Ionicons
                  name={
                    session.mode === 'online'
                      ? 'videocam-outline'
                      : 'location-outline'
                  }
                  size={15}
                  color="#5F6368"
                />
                <Text style={styles.sessionInfo}>
                  {session.mode === 'online'
                    ? `Online${session.platform ? ` • ${session.platform}` : ''}`
                    : `In-person${session.locationName ? ` • ${session.locationName}` : ''}`}
                </Text>
              </View>

              <View style={styles.tapSessionRow}>
                <Text style={styles.tapSessionText}>
                  Tap to view session details
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#1F456D"
                />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <Text style={styles.journalHeading}>
        {journalTitle}
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
            <View style={styles.emptyJournal}>
              <Ionicons
                name="journal-outline"
                size={44}
                color="#E8A33D"
              />

              <Text style={styles.emptyJournalText}>
                No entries logged yet. After your session,
                tap + to record what you covered.
              </Text>
            </View>
          )
        }
      />

      {/* Add journal entry button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openAdd}
      >
        <Ionicons name="add" size={30} color="#1F456D" />
      </TouchableOpacity>

      {/* Add / edit journal dialog */}
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
                ? 'Edit Journal Entry'
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

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCancel}
              >
                <Text style={styles.cancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveEntry}
                disabled={saving}
                style={styles.modalSave}
              >
                <Text style={styles.saveText}>
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

  mentorIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
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

  partnerName: {
    fontWeight: 'bold',
    color: '#1F456D',
  },

  partnerEmail: {
    fontSize: 12,
    color: '#5F6368',
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

  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  milestoneText: {
    marginLeft: 10,
    fontSize: 14,
  },

  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  sessionSubtitle: {
    fontSize: 12,
    color: '#8D99AE',
    marginTop: -7,
  },

  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F456D',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },

  emptySessions: {
    alignItems: 'center',
    paddingVertical: 22,
  },

  emptySessionText: {
    color: '#5F6368',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },

  emptySessionHint: {
    color: '#8D99AE',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  sessionCard: {
    backgroundColor: '#FAF7F0',
    borderRadius: 14,
    padding: 13,
    marginTop: 10,
  },

  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  sessionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F456D',
    marginRight: 8,
  },

  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },

  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },

  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  sessionInfo: {
    fontSize: 12,
    color: '#5F6368',
    marginLeft: 7,
    flex: 1,
  },

  tapSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E5DED0',
    marginTop: 12,
    paddingTop: 9,
  },

  tapSessionText: {
    color: '#1F456D',
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },

  journalHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F456D',
    marginLeft: 20,
    marginBottom: 10,
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

  emptyJournal: {
    alignItems: 'center',
    padding: 30,
  },

  emptyJournalText: {
    color: '#5F6368',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
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

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },

  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  cancelText: {
    color: '#5F6368',
    fontWeight: '600',
  },

  modalSave: {
    backgroundColor: '#1F456D',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
  },

  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
