import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView,
  Keyboard, Platform, Alert, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection, query, orderBy, onSnapshot, doc, writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import Avatar from '../components/Avatar';
import { saveCache, loadCache } from '../utils/cache';
import { useOnline, warnOffline } from '../utils/connection';
import { sendPush } from '../utils/notifications';

const GROUP_GAP = 5 * 60 * 1000; // messages from the same person within 5 minutes are grouped
const CACHE_LIMIT = 100; // how many recent messages are saved for offline viewing

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const dayKey = (timestamp) => new Date(timestamp).toDateString();

// "Today", "Yesterday", or a date such as "12 Oct" (the year is added for older years)
const dayLabel = (timestamp) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  const options = { day: 'numeric', month: 'short' };
  if (date.getFullYear() !== today.getFullYear()) options.year = 'numeric';
  return date.toLocaleDateString('en-GB', options);
};

// messages arrive newest first (the list is inverted), so a date label is placed
// AFTER the oldest message of each day - that is where it appears above the messages on screen
const buildRows = (messages) => {
  const rows = [];
  messages.forEach((m, i) => {
    const newer = messages[i - 1];
    const older = messages[i + 1];
    const sameDayOlder = !!older && dayKey(older.timestamp) === dayKey(m.timestamp);
    const sameDayNewer = !!newer && dayKey(newer.timestamp) === dayKey(m.timestamp);
    const withOlder =
      sameDayOlder && older.senderId === m.senderId && m.timestamp - older.timestamp < GROUP_GAP;
    const withNewer =
      sameDayNewer && newer.senderId === m.senderId && newer.timestamp - m.timestamp < GROUP_GAP;

    rows.push({ type: 'message', key: m.id, message: m, withOlder, withNewer });
    if (!sameDayOlder) {
      rows.push({ type: 'date', key: `date_${m.id}`, label: dayLabel(m.timestamp) });
    }
  });
  return rows;
};

// One-to-one chat for an accepted Loop.
// Messages are stored under requests/{requestId}/messages
export default function ChatScreen({ route, navigation }) {
  const { requestId, partnerName } = route.params;
  const myUid = auth.currentUser.uid;
  const myName = auth.currentUser.displayName || auth.currentUser.email;
  const online = useOnline();
  const insets = useSafeAreaInsets();

  const [loop, setLoop] = useState(null); // the Loop: who the other person is, the skill, who has read what
  const [messages, setMessages] = useState([]); // newest first
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [topOffset, setTopOffset] = useState(0); // distance from the top of the screen to this view

  const listRef = useRef(null);
  const rootRef = useRef(null);
  const messagesRef = useRef([]);
  const loopRef = useRef(null);
  const liveMessages = useRef(false); // true once real data has arrived (it replaces the saved copy)
  const liveLoop = useRef(false);

  // the other person, from the Loop (falls back to the name we were given)
  const partnerId = loop ? (loop.senderId === myUid ? loop.receiverId : loop.senderId) : null;
  const shownName = loop
    ? (loop.senderId === myUid ? loop.receiverName : loop.senderName) || partnerName
    : partnerName;
  const skillName = loop?.skillName || '';

  // header: profile picture, name and skill
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={shownName} size={28} />
          <View style={{ marginLeft: 10, maxWidth: 220 }}>
            <Text numberOfLines={1} style={{ color: '#FAF7F0', fontSize: 16, fontWeight: 'bold' }}>
              {shownName || 'Chat'}
            </Text>
            {skillName ? (
              <Text numberOfLines={1} style={{ color: '#E8A33D', fontSize: 12, fontWeight: '600' }}>
                {skillName}
              </Text>
            ) : null}
          </View>
        </View>
      ),
    });
  }, [navigation, shownName, skillName]);

  // show the saved copy first, then live data from Firestore replaces it
  useEffect(() => {
    let alive = true;
    const cacheKey = `${myUid}_chat_${requestId}`;
    const persist = () =>
      saveCache(cacheKey, {
        messages: messagesRef.current.slice(0, CACHE_LIMIT),
        loop: loopRef.current,
      });

    loadCache(cacheKey).then((saved) => {
      if (!alive || !saved) return;
      if (!liveMessages.current && saved.messages) {
        messagesRef.current = saved.messages;
        setMessages(saved.messages);
      }
      if (!liveLoop.current && saved.loop) {
        loopRef.current = saved.loop;
        setLoop(saved.loop);
      }
    });

    // live Loop: gives us the skill and the other person's lastReadAt (the "Seen" status)
    const unsubscribeLoop = onSnapshot(
      doc(db, 'requests', requestId),
      (snap) => {
        if (!alive || !snap.exists()) return;
        const data = snap.data();
        liveLoop.current = true;
        loopRef.current = data;
        setLoop(data);
        if (!snap.metadata.fromCache) persist();
      },
      (error) => console.log('Loop listener error:', error.message)
    );

    // live messages: new ones appear by themselves
    const unsubscribeMessages = onSnapshot(
      query(collection(db, 'requests', requestId, 'messages'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        if (!alive) return;
        // an empty answer from the phone's own memory (offline) must not wipe the saved copy
        if (snapshot.metadata.fromCache && snapshot.empty) return;
        const list = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
        liveMessages.current = true;
        messagesRef.current = list;
        setMessages(list);
        if (!snapshot.metadata.fromCache) persist();
      },
      (error) => console.log('Chat listener error:', error.message)
    );

    return () => {
      alive = false;
      unsubscribeLoop();
      unsubscribeMessages();
    };
  }, [requestId, myUid]);

  // remember whether the keyboard is open (the home-indicator space is dropped while it is)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // measure how far this screen starts from the top, so the keyboard offset is right on every iPhone
  const measureTop = () => {
    rootRef.current?.measureInWindow((x, y) => {
      if (Number.isFinite(y)) setTopOffset(y);
    });
  };
  useEffect(() => {
    const timer = setTimeout(measureTop, 400);
    return () => clearTimeout(timer);
  }, []);

  const rows = useMemo(() => buildRows(messages), [messages]);
  const latestMineId = messages.find((m) => m.senderId === myUid)?.id || null; // newest message I sent
  const partnerReadAt = (partnerId && loop?.lastReadAt?.[partnerId]) || 0;

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || sending) return;
    if (!online) { warnOffline(); return; }

    setSending(true);
    setText('');
    try {
      const now = Date.now(); // the same time goes on the message and on the Loop preview
      const messageRef = doc(collection(db, 'requests', requestId, 'messages'));
      const batch = writeBatch(db);
      batch.set(messageRef, {
        id: messageRef.id,
        text: content,
        senderId: myUid,
        senderName: myName,
        timestamp: now,
      });
      // the preview used by the chat list, the unread dots and "Seen" - saved together with the message
      batch.update(doc(db, 'requests', requestId), {
        lastMessage: content,
        lastMessageAt: now,
        lastSenderId: myUid,
      });
      await batch.commit();
    } catch (error) {
      setText(content); // give the text back so nothing is lost
      Alert.alert('Message not sent', error.message);
      setSending(false);
      return;
    }

    listRef.current?.scrollToOffset({ offset: 0, animated: true }); // jump to the newest message

    // push to the other person (for when their app is closed)
    if (loop) {
      const toUid = loop.senderId === myUid ? loop.receiverId : loop.senderId;
      sendPush(toUid, myName, content, { type: 'message', requestId, partnerName: myName });
    }
    setSending(false);
  };

  const renderRow = ({ item }) => {
    // the day label ("Today", "Yesterday", a date)
    if (item.type === 'date') {
      return (
        <View style={styles.dateWrap}>
          <Text style={styles.dateText}>{item.label}</Text>
        </View>
      );
    }

    const { message, withOlder, withNewer } = item;
    const mine = message.senderId === myUid;
    const isLastInGroup = !withNewer;
    const showStatus = mine && message.id === latestMineId;
    const seen = showStatus && partnerReadAt >= message.timestamp;
    const side = mine ? 'flex-end' : 'flex-start';

    // inside a group the corners are squarer; the last bubble gets the "tail"
    const corners = mine
      ? { borderTopRightRadius: withOlder ? 6 : 18, borderBottomRightRadius: isLastInGroup ? 4 : 6 }
      : { borderTopLeftRadius: withOlder ? 6 : 18, borderBottomLeftRadius: isLastInGroup ? 4 : 6 };

    return (
      <View style={{ alignSelf: side, maxWidth: '78%', marginBottom: isLastInGroup ? 10 : 2 }}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, corners]}>
          <Text style={{ color: mine ? '#fff' : '#1A1A1A', fontSize: 15, lineHeight: 21 }}>{message.text}</Text>
        </View>
        {isLastInGroup && (
          <View style={[styles.metaRow, { alignSelf: side }]}>
            <Text style={styles.time}>{formatTime(message.timestamp)}</Text>
            {showStatus && (
              <>
                <Ionicons
                  name={seen ? 'checkmark-done' : 'checkmark'}
                  size={13}
                  color={seen ? '#2D6A4F' : '#8D99AE'}
                  style={{ marginLeft: 6 }}
                />
                <Text style={[styles.status, seen && { color: '#2D6A4F' }]}>{seen ? 'Seen' : 'Sent'}</Text>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View ref={rootRef} collapsable={false} onLayout={measureTop} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? topOffset : 0}
      >
        {/* inverted list: the newest message sits at the bottom */}
        <FlatList
          ref={listRef}
          data={rows}
          inverted
          extraData={partnerReadAt}
          keyExtractor={(item) => item.key}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            // flipped back because the list itself is inverted
            <View style={{ transform: [{ scaleY: -1 }], alignItems: 'center', padding: 30 }}>
              <Ionicons name="chatbubbles-outline" size={46} color="#E8A33D" />
              <Text style={{ color: '#5F6368', textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
                Say hello to {shownName || 'your partner'}! Agree on a time and place to meet, then learn together in person or online.
              </Text>
            </View>
          }
        />

        {/* message box: sits above the iPhone home indicator when the keyboard is closed */}
        <View style={[styles.inputBar, { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.input}
            placeholder={online ? 'Type a message...' : "You're offline (view only)"}
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
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubbleMine: { backgroundColor: '#1F456D' },
  bubbleTheirs: {
    backgroundColor: '#fff',
    shadowColor: '#1F456D', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  time: { fontSize: 10, color: '#8D99AE' },
  status: { fontSize: 10, color: '#8D99AE', marginLeft: 3, fontWeight: '600' },
  dateWrap: { alignItems: 'center', marginVertical: 10 },
  dateText: {
    fontSize: 11, fontWeight: '600', color: '#7A7468', backgroundColor: '#EFE7D6',
    paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, overflow: 'hidden',
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff',
    paddingTop: 10, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: '#EFE7D6',
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