import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView,
  Platform, Alert, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useOnline, warnOffline } from '../utils/connection';
import { sendPush } from '../utils/notifications';

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// One-to-one chat for an accepted Loop.
// Messages are stored under requests/{requestId}/messages
export default function ChatScreen({ route }) {
  const { requestId, partnerName } = route.params;
  const myUid = auth.currentUser.uid;
  const myName = auth.currentUser.displayName || auth.currentUser.email;
  const online = useOnline();

  const [loop, setLoop] = useState(null); // the Loop, so we know who the other person is
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'requests', requestId))
      .then((snap) => {
        if (snap.exists()) setLoop(snap.data());
      })
      .catch((error) => console.log('Could not load Loop:', error.message));
  }, [requestId]);

  // real-time listener: new messages appear by themselves
  useEffect(() => {
    const q = query(collection(db, 'requests', requestId, 'messages'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
      },
      (error) => console.log('Chat listener error:', error.message)
    );
    return unsubscribe; // stop listening when the screen closes
  }, [requestId]);

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || sending) return;
    if (!online) { warnOffline(); return; }

    setSending(true);
    setText('');
    try {
      const ref = doc(collection(db, 'requests', requestId, 'messages'));
      await setDoc(ref, {
        id: ref.id,
        text: content,
        senderId: myUid,
        senderName: myName,
        timestamp: Date.now(),
      });
    } catch (error) {
      setText(content); // give the text back so nothing is lost
      Alert.alert('Message not sent', error.message);
      setSending(false);
      return;
    }

    // keep a preview on the Loop so the chat list and notifications can use it
    try {
      await updateDoc(doc(db, 'requests', requestId), {
        lastMessage: content,
        lastMessageAt: Date.now(),
        lastSenderId: myUid,
      });
    } catch (error) {
      console.log('Preview not updated:', error.message);
    }

    // push to the other person (for when their app is closed)
    if (loop) {
      const partnerId = loop.senderId === myUid ? loop.receiverId : loop.senderId;
      sendPush(partnerId, myName, content, { type: 'message', requestId, partnerName: myName });
    }
    setSending(false);
  };

  // one chat bubble: mine on the right (navy), theirs on the left (white)
  const renderMessage = ({ item }) => {
    const mine = item.senderId === myUid;
    return (
      <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%', marginBottom: 10 }}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={{ color: mine ? '#fff' : '#1A1A1A', fontSize: 15, lineHeight: 21 }}>{item.text}</Text>
        </View>
        <Text style={[styles.time, { alignSelf: mine ? 'flex-end' : 'flex-start' }]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* inverted list: the newest message sits at the bottom */}
      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          // flipped back because the list itself is inverted
          <View style={{ transform: [{ scaleY: -1 }], alignItems: 'center', padding: 30 }}>
            <Ionicons name="chatbubbles-outline" size={46} color="#E8A33D" />
            <Text style={{ color: '#5F6368', textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
              Say hello to {partnerName}! Agree on a time and place to meet, then learn together in person or online.
            </Text>
          </View>
        }
      />

      {/* message box */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#8D99AE"
          multiline
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && { opacity: 0.5 }]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#1F456D" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubbleMine: { backgroundColor: '#1F456D', borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#1F456D', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  time: { fontSize: 10, color: '#8D99AE', marginTop: 3 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff',
    padding: 10, borderTopWidth: 1, borderTopColor: '#EFE7D6',
  },
  input: {
    flex: 1, maxHeight: 100, backgroundColor: '#FAF7F0', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1A1A1A',
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8A33D',
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
});