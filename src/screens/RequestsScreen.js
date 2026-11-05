
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import ScreenHeader from '../components/ScreenHeader';
import Avatar from '../components/Avatar';
import { loadWithCache } from '../utils/cache';
import { useOnline, warnOffline } from '../utils/connection';
import { sendPush } from '../utils/notifications';

const TABS = ['Received', 'Sent', 'Active'];

export default function RequestsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Received');
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(true);

  const myUid = auth.currentUser?.uid;
  const online = useOnline();

  const loadRequests = async () => {
    setLoading(true);

    // Fresh from Firestore when online,
    // the saved copy when offline.
    const data = await loadWithCache(`${myUid}_requests`, async () => {
      const requestsRef = collection(db, 'requests');

      const receivedSnap = await getDocs(
        query(requestsRef, where('receiverId', '==', myUid))
      );

      const sentSnap = await getDocs(
        query(requestsRef, where('senderId', '==', myUid))
      );

      return {
        receivedAll: receivedSnap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })),

        sentAll: sentSnap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })),
      };
    });

    if (data) {
      const newestFirst = (a, b) =>
        (b.timestamp || 0) - (a.timestamp || 0);

      setReceived(
        data.receivedAll
          .filter((r) => r.status === 'pending')
          .sort(newestFirst)
      );

      setSent(
        data.sentAll
          .filter((r) => r.status === 'pending')
          .sort(newestFirst)
      );

      setActive(
        [...data.receivedAll, ...data.sentAll]
          .filter((r) => r.status === 'accepted')
          .sort(newestFirst)
      );
    }

    setLoading(false);
  };

  // Reload when the tab is opened,
  // and again when the connection comes back.
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [online])
  );

  const updateStatus = async (item, newStatus) => {
    if (!online) { warnOffline(); return; }
    try {
      await updateDoc(doc(db, 'requests', item.id), { status: newStatus });

      // tell the learner their request was accepted
      if (newStatus === 'accepted') {
        sendPush(
          item.senderId,
          'Request accepted',
          `${item.receiverName} accepted your request to learn ${item.skillName}`,
          { type: 'accepted', requestId: item.id }
        );
      }
      loadRequests();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const confirmCancel = (requestId) => {
    if (!online) {
      warnOffline();
      return;
    }

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'requests', requestId));
              loadRequests();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const lists = {
    Received: received,
    Sent: sent,
    Active: active,
  };

  const emptyMessages = {
    Received: 'No pending requests received.',
    Sent: 'No pending requests sent.',
    Active: 'No active Loops yet.',
  };

  const renderItem = ({ item }) => {
    const iAmLearner = item.senderId === myUid;
    const otherName = iAmLearner
      ? item.receiverName
      : item.senderName;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        disabled={activeTab !== 'Active'}
        onPress={() =>
          navigation.navigate('LoopDetail', {
            requestId: item.id,
          })
        }
      >
        <View style={styles.cardTop}>
          <Avatar name={otherName} size={44} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardName}>{otherName}</Text>

            <View style={styles.skillPill}>
              <Text style={styles.skillPillText}>
                {item.skillName}
              </Text>
            </View>
          </View>

          {activeTab === 'Active' && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color="#B9B2A3"
            />
          )}
        </View>

        {activeTab !== 'Active' && (
          <Text style={styles.message}>
            "{item.message}"
          </Text>
        )}

        {activeTab === 'Received' && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => updateStatus(item, 'accepted')}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => updateStatus(item, 'declined')}
            >
              <Ionicons name="close" size={16} color="#D62828" />
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'Sent' && (
          <View style={styles.buttonRow}>
            <View style={styles.statusPill}>
              <Ionicons
                name="time-outline"
                size={14}
                color="#B7791F"
              />
              <Text style={styles.statusText}>Pending</Text>
            </View>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => confirmCancel(item.id)}
            >
              <Text style={styles.declineText}>
                Cancel Request
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'Active' && (
          <View style={styles.buttonRow}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: '#E8F5E9' },
              ]}
            >
              <Ionicons
                name={
                  iAmLearner
                    ? 'school-outline'
                    : 'easel-outline'
                }
                size={14}
                color="#2D6A4F"
              />

              <Text
                style={[
                  styles.statusText,
                  { color: '#2D6A4F' },
                ]}
              >
                {iAmLearner
                  ? 'You are learning'
                  : 'You are teaching'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.messageButton}
              onPress={() =>
                navigation.navigate('Chat', {
                  requestId: item.id,
                  partnerName: otherName,
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
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="My Connections"
        subtitle="Requests and active Loops"
      />

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab} ({lists[tab].length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#E8A33D"
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={lists[activeTab]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {emptyMessages[activeTab]}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#EFE7D6',
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 14,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },

  tabActive: {
    backgroundColor: '#1F456D',
  },

  tabText: {
    fontSize: 12,
    color: '#7A7468',
    fontWeight: '600',
  },

  tabTextActive: {
    color: '#FAF7F0',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#1F456D',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F456D',
  },

  skillPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 4,
  },

  skillPillText: {
    fontSize: 11,
    color: '#2D6A4F',
    fontWeight: '600',
  },

  message: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
    marginTop: 10,
  },

  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D6A4F',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginRight: 10,
  },

  acceptText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },

  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D62828',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },

  declineText: {
    color: '#D62828',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },

  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1F456D',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
  },

  messageText: {
    color: '#1F456D',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF0DC',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },

  statusText: {
    fontSize: 12,
    color: '#B7791F',
    fontWeight: '600',
    marginLeft: 4,
  },

  emptyText: {
    textAlign: 'center',
    color: '#7A7468',
    marginTop: 20,
  },
});
