import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import Avatar from '../components/Avatar';
import { hasUnread } from '../hooks/useBadgeCounts';
import { saveCache, loadCache } from '../utils/cache';

// time of day if it was today, otherwise the date
const formatWhen = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const newestFirst = (a, b) =>
  (b.lastMessageAt || b.timestamp || 0) - (a.lastMessageAt || a.timestamp || 0);

// Lists every accepted Loop (as learner or mentor), newest conversation first.
// Updates live, and shows the saved copy first (also when offline).
export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const myUid = auth.currentUser.uid;

  useEffect(() => {
    let alive = true;
    const cacheKey = `${myUid}_chatlist`;
    const requestsRef = collection(db, 'requests');

    let sentDocs = null;      // Loops where I am the learner
    let receivedDocs = null;  // Loops where I am the mentor
    let sentFresh = false;    // true when the answer came from the server, not the phone's memory
    let receivedFresh = false;
    let live = false;

    // saved copy first
    loadCache(cacheKey).then((saved) => {
      if (!alive || live || !saved) return;
      setChats(saved);
      setLoading(false);
    });

    // join both lists once BOTH have answered, so a half-loaded list never appears or gets saved
    const publish = () => {
      if (!sentDocs || !receivedDocs) return;
      const all = [...sentDocs, ...receivedDocs].sort(newestFirst);
      live = true;
      setChats(all);
      setLoading(false);
      if (sentFresh && receivedFresh) saveCache(cacheKey, all);
    };

    const listen = (field, assign) =>
      onSnapshot(
        query(requestsRef, where(field, '==', myUid), where('status', '==', 'accepted')),
        (snapshot) => {
          if (!alive) return;
          // an empty answer from the phone's own memory (offline) must not hide the saved list
          if (snapshot.metadata.fromCache && snapshot.empty) return;
          assign(
            snapshot.docs.map((d) => ({ ...d.data(), id: d.id })),
            !snapshot.metadata.fromCache
          );
          publish();
        },
        (error) => {
          console.log('Chat list error:', error.message);
          if (alive) setLoading(false);
        }
      );

    const unsubscribeSent = listen('senderId', (list, fresh) => { sentDocs = list; sentFresh = fresh; });
    const unsubscribeReceived = listen('receiverId', (list, fresh) => { receivedDocs = list; receivedFresh = fresh; });

    // offline with nothing saved: stop the spinner instead of spinning forever
    const timer = setTimeout(() => { if (alive) setLoading(false); }, 4000);

    return () => {
      alive = false;
      clearTimeout(timer);
      unsubscribeSent();
      unsubscribeReceived();
    };
  }, [myUid]);

  const renderChat = ({ item }) => {
    const partnerName = item.senderId === myUid ? item.receiverName : item.senderName;
    const unread = hasUnread(item, myUid); // the same rule as the Messages tab badge
    const preview = item.lastMessage
      ? `${item.lastSenderId === myUid ? 'You: ' : ''}${item.lastMessage}`
      : 'Say hello and plan your first session';

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Chat', { requestId: item.id, partnerName })}
        style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20,
          padding: 14, marginHorizontal: 20, marginBottom: 12,
          shadowColor: '#1F456D', shadowOpacity: 0.08, shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 }, elevation: 3,
        }}
      >
        <Avatar name={partnerName} size={46} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: unread ? 'bold' : '600', color: '#1F456D' }}>{partnerName}</Text>
          <Text style={{ fontSize: 12, color: '#2D6A4F', fontWeight: '600', marginTop: 2 }}>{item.skillName}</Text>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13, marginTop: 4,
              color: unread ? '#1A1A1A' : '#5F6368',
              fontWeight: unread ? '700' : '400',
            }}
          >
            {preview}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
          <Text style={{ fontSize: 11, color: unread ? '#C97C1F' : '#8D99AE', fontWeight: unread ? 'bold' : '400' }}>
            {formatWhen(item.lastMessageAt)}
          </Text>
          {unread && (
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#E8A33D', marginTop: 8 }} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#E8A33D" style={{ marginTop: 40 }} />;
  }

  return (
    <FlatList
      data={chats}
      keyExtractor={(item) => item.id}
      renderItem={renderChat}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Ionicons name="chatbubbles-outline" size={56} color="#E8A33D" />
          <Text style={{ color: '#5F6368', textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
            No conversations yet. Once a mentor accepts a request, you can message each other here.
          </Text>
        </View>
      }
    />
  );
}