import { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { saveCache, loadCache } from '../utils/cache';

// A chat has unread messages when the last message is from the other person
// and is newer than the time I last read this chat (stored as lastReadAt.<myUid> on the Loop).
export const hasUnread = (loop, uid) => {
  const lastRead = loop.lastReadAt?.[uid] || 0;
  return (loop.lastMessageAt || 0) > lastRead && !!loop.lastSenderId && loop.lastSenderId !== uid;
};

// Live numbers for the tab badges:
//  - pending: requests other people sent me that I have not answered yet  (Requests tab)
//  - unread:  chats that have messages I have not read yet                 (Messages tab)
// activeChatId = the chat the user is looking at right now (it is marked as read automatically).
export default function useBadgeCounts(enabled, activeChatId) {
  const [pending, setPending] = useState(0);
  const [loops, setLoops] = useState([]);
  const sent = useRef([]);
  const received = useRef([]);
  const lastMarked = useRef({}); // Loop id -> read time we already wrote

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!enabled || !uid) {
      setPending(0);
      setLoops([]);
      return undefined;
    }

    let alive = true;
    const requestsRef = collection(db, 'requests');

    // show the last known numbers straight away (also works offline)
    loadCache(`${uid}_badges`).then((saved) => {
      if (alive && saved) {
        setPending((p) => p || saved.pending || 0);
      }
    });

    const unsubscribers = [];

    unsubscribers.push(
      onSnapshot(
        query(requestsRef, where('receiverId', '==', uid), where('status', '==', 'pending')),
        (snapshot) => {
          if (!alive) return;
          setPending(snapshot.size);
          saveCache(`${uid}_badges`, { pending: snapshot.size });
        },
        (error) => console.log('Pending badge error:', error.message)
      )
    );

    const publishLoops = () => setLoops([...sent.current, ...received.current]);

    unsubscribers.push(
      onSnapshot(
        query(requestsRef, where('senderId', '==', uid), where('status', '==', 'accepted')),
        (snapshot) => {
          sent.current = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (alive) publishLoops();
        },
        (error) => console.log('Chat badge error:', error.message)
      )
    );
    unsubscribers.push(
      onSnapshot(
        query(requestsRef, where('receiverId', '==', uid), where('status', '==', 'accepted')),
        (snapshot) => {
          received.current = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (alive) publishLoops();
        },
        (error) => console.log('Chat badge error:', error.message)
      )
    );

    return () => {
      alive = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      sent.current = [];
      received.current = [];
    };
  }, [enabled, uid]);

  // while a chat is open, keep it marked as read (new messages can arrive while you are looking)
  useEffect(() => {
    if (!enabled || !uid || !activeChatId) return;
    const loop = loops.find((l) => l.id === activeChatId);
    if (!loop || !hasUnread(loop, uid)) return;

    // never earlier than the last message, so clocks that differ a little cannot cause a loop
    const readAt = Math.max(Date.now(), loop.lastMessageAt || 0);
    if (lastMarked.current[activeChatId] >= readAt) return;
    lastMarked.current[activeChatId] = readAt;

    updateDoc(doc(db, 'requests', activeChatId), { [`lastReadAt.${uid}`]: readAt }).catch((error) =>
      console.log('Could not mark chat as read:', error.message)
    );
  }, [enabled, uid, activeChatId, loops]);

  const unread = loops.filter((l) => hasUnread(l, uid)).length;

  return { pending, unread };
}
