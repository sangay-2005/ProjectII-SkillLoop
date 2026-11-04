import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import Avatar from '../components/Avatar';

// time of day if it was today, otherwise the date
const formatWhen = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// Lists every accepted Loop (as learner or mentor), newest conversation first
export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const myUid = auth.currentUser.uid;

  const loadChats = async () => {
    try {
      const requestsRef = collection(db, 'requests');
      const asLearner = await getDocs(
        query(requestsRef, where('senderId', '==', myUid), where('status', '==', 'accepted'))
      );
      const asMentor = await getDocs(
        query(requestsRef, where('receiverId', '==', myUid), where('status', '==', 'accepted'))
      );

      const all = [...asLearner.docs, ...asMentor.docs].map((d) => ({ ...d.data(), id: d.id }));
      all.sort(
        (a, b) => (b.lastMessageAt || b.timestamp || 0) - (a.lastMessageAt || a.timestamp || 0)
      );
      setChats(all);
    } catch (error) {
      console.log('Error loading chats:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // reload whenever this screen is shown
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  const renderChat = ({ item }) => {
    const partnerName = item.senderId === myUid ? item.receiverName : item.senderName;
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
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F456D' }}>{partnerName}</Text>
          <Text style={{ fontSize: 12, color: '#2D6A4F', fontWeight: '600', marginTop: 2 }}>{item.skillName}</Text>
          <Text numberOfLines={1} style={{ fontSize: 13, color: '#5F6368', marginTop: 4 }}>{preview}</Text>
        </View>
        <Text style={{ fontSize: 11, color: '#8D99AE' }}>{formatWhen(item.lastMessageAt)}</Text>
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