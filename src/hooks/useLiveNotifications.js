import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { setupNotifications, registerPushToken, showLocalNotification } from '../utils/notifications';

// Watches Firestore while the app is open and shows a notification when:
//  - someone sends you a request
//  - your request is accepted
//  - you get a new chat message
// (When the app is closed, the push service delivers these instead.)
export default function useLiveNotifications(navigationRef, enabled) {
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!enabled || !uid) return undefined;

    // ask permission, then save this phone's push token
    setupNotifications().then((allowed) => {
      if (allowed) registerPushToken(uid);
    });

    const requestsRef = collection(db, 'requests');
    const unsubscribers = [];
    const appIsOpen = () => AppState.currentState === 'active';

    // is the user already looking at this chat?
    const viewingChat = (requestId) => {
      const route = navigationRef.isReady() ? navigationRef.getCurrentRoute() : null;
      return route?.name === 'Chat' && route.params?.requestId === requestId;
    };

    // 1. new requests sent to me
    let firstRequests = true;
    unsubscribers.push(
      onSnapshot(
        query(requestsRef, where('receiverId', '==', uid), where('status', '==', 'pending')),
        (snapshot) => {
          if (!firstRequests) {
            snapshot.docChanges().forEach((change) => {
              if (change.type !== 'added' || !appIsOpen()) return;
              const r = change.doc.data();
              showLocalNotification('New request', `${r.senderName} wants to learn ${r.skillName} from you`, {
                type: 'request',
              });
            });
          }
          firstRequests = false; // ignore the requests that already existed
        },
        (error) => console.log('Request listener error:', error.message)
      )
    );

    // 2. my requests that just got accepted
    let firstAccepted = true;
    unsubscribers.push(
      onSnapshot(
        query(requestsRef, where('senderId', '==', uid), where('status', '==', 'accepted')),
        (snapshot) => {
          if (!firstAccepted) {
            snapshot.docChanges().forEach((change) => {
              if (change.type !== 'added' || !appIsOpen()) return;
              const r = change.doc.data();
              showLocalNotification(
                'Request accepted',
                `${r.receiverName} accepted your request to learn ${r.skillName}`,
                { type: 'accepted', requestId: change.doc.id }
              );
            });
          }
          firstAccepted = false;
        },
        (error) => console.log('Accepted listener error:', error.message)
      )
    );

    // 3. new chat messages. Each Loop keeps the time and sender of its last message,
    // so a change in lastMessageAt from the other person means a new message.
    const lastSeen = {}; // Loop id -> last message time already known
    const listenMessages = (q) => {
      let first = true;
      unsubscribers.push(
        onSnapshot(
          q,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              const r = change.doc.data();
              const previous = lastSeen[change.doc.id] || 0;
              lastSeen[change.doc.id] = r.lastMessageAt || 0;

              if (first || change.type === 'removed') return;
              const isNew = (r.lastMessageAt || 0) > previous && r.lastSenderId && r.lastSenderId !== uid;
              if (!isNew || !appIsOpen() || viewingChat(change.doc.id)) return;

              const senderName = r.lastSenderId === r.senderId ? r.senderName : r.receiverName;
              showLocalNotification(senderName, r.lastMessage, {
                type: 'message',
                requestId: change.doc.id,
                partnerName: senderName,
              });
            });
            first = false;
          },
          (error) => console.log('Message listener error:', error.message)
        )
      );
    };
    listenMessages(query(requestsRef, where('senderId', '==', uid), where('status', '==', 'accepted')));
    listenMessages(query(requestsRef, where('receiverId', '==', uid), where('status', '==', 'accepted')));

    // tapping a notification opens the matching screen
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      if (!navigationRef.isReady()) return;

      if (data.type === 'message') {
        navigationRef.navigate('Chat', { requestId: data.requestId, partnerName: data.partnerName });
      } else if (data.type === 'accepted') {
        navigationRef.navigate('LoopDetail', { requestId: data.requestId });
      } else {
        navigationRef.navigate('MainTabs', { screen: 'Requests' });
      }
    });

    // stop everything when the user logs out
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      subscription.remove();
    };
  }, [enabled]);
}