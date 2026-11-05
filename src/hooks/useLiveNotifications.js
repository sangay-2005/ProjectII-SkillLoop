
import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

import { auth, db } from '../config/firebase';

import {
  setupNotifications,
  registerPushToken,
  showLocalNotification,
} from '../utils/notifications';

export default function useLiveNotifications(navigationRef, enabled) {
  useEffect(() => {
    const uid = auth.currentUser?.uid;

    if (!enabled || !uid) return undefined;

    let isMounted = true;
    let responseTimer = null;

    setupNotifications()
      .then((allowed) => {
        if (allowed && isMounted && auth.currentUser?.uid === uid) {
          return registerPushToken(uid);
        }
      })
      .catch((error) => {
        console.log('[notifications] Setup failed:', error.message);
      });

    const requestsRef = collection(db, 'requests');
    const unsubscribers = [];

    const appIsOpen = () => AppState.currentState === 'active';

    const notify = (title, body, data = {}) => {
      showLocalNotification(title, body, data).catch((error) => {
        console.log('[notifications] Local notification failed:', error.message);
      });
    };

    const viewingChat = (requestId) => {
      const route = navigationRef.isReady()
        ? navigationRef.getCurrentRoute()
        : null;

      return (
        route?.name === 'Chat' &&
        route.params?.requestId === requestId
      );
    };

    // 1. New requests received.
    let firstRequests = true;

    unsubscribers.push(
      onSnapshot(
        query(
          requestsRef,
          where('receiverId', '==', uid),
          where('status', '==', 'pending')
        ),
        (snapshot) => {
          if (!firstRequests) {
            snapshot.docChanges().forEach((change) => {
              if (change.type !== 'added' || !appIsOpen()) return;

              const request = change.doc.data();

              notify(
                'New request',
                `${request.senderName} wants to learn ${request.skillName} from you`,
                {
                  type: 'request',
                  requestId: change.doc.id,
                }
              );
            });
          }

          firstRequests = false;
        },
        (error) => {
          console.log('[notifications] Request listener:', error.message);
        }
      )
    );

    // 2. Requests accepted.
    let firstAccepted = true;

    unsubscribers.push(
      onSnapshot(
        query(
          requestsRef,
          where('senderId', '==', uid),
          where('status', '==', 'accepted')
        ),
        (snapshot) => {
          if (!firstAccepted) {
            snapshot.docChanges().forEach((change) => {
              if (change.type !== 'added' || !appIsOpen()) return;

              const request = change.doc.data();

              notify(
                'Request accepted',
                `${request.receiverName} accepted your request to learn ${request.skillName}`,
                {
                  type: 'accepted',
                  requestId: change.doc.id,
                }
              );
            });
          }

          firstAccepted = false;
        },
        (error) => {
          console.log('[notifications] Accepted listener:', error.message);
        }
      )
    );

    // 3. Requests declined.
    let firstDeclined = true;

    unsubscribers.push(
      onSnapshot(
        query(
          requestsRef,
          where('senderId', '==', uid),
          where('status', '==', 'declined')
        ),
        (snapshot) => {
          if (!firstDeclined) {
            snapshot.docChanges().forEach((change) => {
              if (change.type !== 'added' || !appIsOpen()) return;

              const request = change.doc.data();

              notify(
                'Request declined',
                `${request.receiverName} declined your request to learn ${request.skillName}`,
                {
                  type: 'declined',
                  requestId: change.doc.id,
                }
              );
            });
          }

          firstDeclined = false;
        },
        (error) => {
          console.log('[notifications] Declined listener:', error.message);
        }
      )
    );

    // 4. New messages in accepted Loops.
    const lastSeen = {};

    const listenMessages = (messageQuery) => {
      let first = true;

      unsubscribers.push(
        onSnapshot(
          messageQuery,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              const request = change.doc.data();
              const previous = lastSeen[change.doc.id] || 0;
              const current = request.lastMessageAt || 0;

              lastSeen[change.doc.id] = current;

              if (first || change.type === 'removed') return;

              const isNew =
                current > previous &&
                request.lastSenderId &&
                request.lastSenderId !== uid;

              if (
                !isNew ||
                !appIsOpen() ||
                viewingChat(change.doc.id)
              ) {
                return;
              }

              const senderName =
                request.lastSenderId === request.senderId
                  ? request.senderName
                  : request.receiverName;

              notify(
                senderName || 'New message',
                request.lastMessage || 'You received a new message',
                {
                  type: 'message',
                  requestId: change.doc.id,
                  partnerName: senderName,
                }
              );
            });

            first = false;
          },
          (error) => {
            console.log('[notifications] Message listener:', error.message);
          }
        )
      );
    };

    listenMessages(
      query(
        requestsRef,
        where('senderId', '==', uid),
        where('status', '==', 'accepted')
      )
    );

    listenMessages(
      query(
        requestsRef,
        where('receiverId', '==', uid),
        where('status', '==', 'accepted')
      )
    );

    // 5. Teaching session proposal and acceptance notifications.
    const sessionNotificationKey = `session_proposals_notified_${uid}`;

    const notifiedSessionIds = new Set();
    const sessionNotificationsInProgress = new Set();
    const sessionListeners = new Map();

    const notifySessionProposalOnce = async (
      requestId,
      sessionId,
      session
    ) => {
      if (
        !isMounted ||
        !appIsOpen() ||
        session.status !== 'pending' ||
        session.proposedBy === uid
      ) {
        return;
      }

      if (
        notifiedSessionIds.has(sessionId) ||
        sessionNotificationsInProgress.has(sessionId)
      ) {
        return;
      }

      sessionNotificationsInProgress.add(sessionId);

      try {
        const stored = await AsyncStorage.getItem(sessionNotificationKey);
        const notified = stored ? JSON.parse(stored) : [];

        if (notified.includes(sessionId)) {
          notifiedSessionIds.add(sessionId);
          return;
        }

        if (!isMounted || !appIsOpen()) return;

        await showLocalNotification(
          'New Teaching Session Proposal',
          `Your learning partner proposed a session about ${session.topic || 'a skill'}. Tap to view and respond.`,
          {
            type: 'session_proposal',
            requestId,
            sessionId,
          }
        );

        notified.push(sessionId);
        notifiedSessionIds.add(sessionId);

        await AsyncStorage.setItem(
          sessionNotificationKey,
          JSON.stringify(notified)
        );
      } catch (error) {
        console.log(
          '[notifications] Session proposal notification failed:',
          error.message
        );
      } finally {
        sessionNotificationsInProgress.delete(sessionId);
      }
    };

    const listenSessions = (loopQuery) => {
      unsubscribers.push(
        onSnapshot(
          loopQuery,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              const requestId = change.doc.id;

              if (change.type === 'removed') {
                sessionListeners.get(requestId)?.();
                sessionListeners.delete(requestId);
                return;
              }

              if (sessionListeners.has(requestId)) return;

              // Remember the previous status of each session.
              const previousStatuses = new Map();

              let firstSessionSnapshot = true;

              const unsubscribe = onSnapshot(
                collection(db, 'requests', requestId, 'sessions'),
                (sessionsSnapshot) => {
                  sessionsSnapshot.docChanges().forEach(
                    (sessionChange) => {
                      if (sessionChange.type === 'removed') return;

                      const sessionId = sessionChange.doc.id;
                      const session = sessionChange.doc.data();

                      const previousStatus =
                        previousStatuses.get(sessionId);

                      // Save the current status for the next update.
                      previousStatuses.set(
                        sessionId,
                        session.status
                      );

                      // Check for new proposals.
                      notifySessionProposalOnce(
                        requestId,
                        sessionId,
                        session
                      );

                      // Ignore the initial snapshot.
                      if (
                        firstSessionSnapshot ||
                        sessionChange.type !== 'modified'
                      ) {
                        return;
                      }

                      // Detect pending -> confirmed.
                      if (
                        previousStatus === 'pending' &&
                        session.status === 'confirmed' &&
                        session.proposedBy === uid &&
                        isMounted &&
                        appIsOpen()
                      ) {
                        console.log(
                          '[notifications] Session acceptance detected:',
                          sessionId
                        );

                        notify(
                          'Session Proposal Accepted',
                          'Your learning partner accepted your teaching session proposal. Your session is now confirmed!',
                          {
                            type: 'session_accepted',
                            requestId,
                            sessionId,
                          }
                        );
                      }
                    }
                  );

                  firstSessionSnapshot = false;
                },
                (error) => {
                  console.log(
                    '[notifications] Session listener:',
                    error.message
                  );
                }
              );

              sessionListeners.set(requestId, unsubscribe);
            });
          },
          (error) => {
            console.log(
              '[notifications] Loop session listener:',
              error.message
            );
          }
        )
      );
    };

    listenSessions(
      query(
        requestsRef,
        where('senderId', '==', uid),
        where('status', '==', 'accepted')
      )
    );

    listenSessions(
      query(
        requestsRef,
        where('receiverId', '==', uid),
        where('status', '==', 'accepted')
      )
    );

    // 6. Open the correct screen when a notification is tapped.
    const handledResponses = new Set();

    const handleNotificationResponse = (response) => {
      if (!response || !navigationRef.isReady()) return false;

      const identifier =
        response.notification.request.identifier;

      if (identifier && handledResponses.has(identifier)) {
        return true;
      }

      const data =
        response.notification.request.content.data || {};

      if (data.type === 'message' && data.requestId) {
        navigationRef.navigate('Chat', {
          requestId: data.requestId,
          partnerName: data.partnerName || 'Chat',
        });
      } else if (
        (
          data.type === 'session_proposal' ||
          data.type === 'session_accepted'
        ) &&
        data.requestId &&
        data.sessionId
      ) {
        navigationRef.navigate('SessionDetail', {
          requestId: data.requestId,
          sessionId: data.sessionId,
        });
      } else if (
        data.type === 'accepted' &&
        data.requestId
      ) {
        navigationRef.navigate('LoopDetail', {
          requestId: data.requestId,
        });
      } else {
        navigationRef.navigate('MainTabs', {
          screen: 'Requests',
        });
      }

      if (identifier) {
        handledResponses.add(identifier);
      }

      Notifications.clearLastNotificationResponseAsync().catch(
        () => {}
      );

      return true;
    };

    const handleWhenReady = (response, attempts = 10) => {
      if (!isMounted || !response) return;

      if (handleNotificationResponse(response)) return;

      if (attempts > 0) {
        responseTimer = setTimeout(() => {
          handleWhenReady(response, attempts - 1);
        }, 250);
      }
    };

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          handleWhenReady(response);
        }
      );

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleWhenReady(response);
      })
      .catch((error) => {
        console.log(
          '[notifications] Last response check failed:',
          error.message
        );
      });

    // Clean up listeners.
    return () => {
      isMounted = false;

      if (responseTimer) {
        clearTimeout(responseTimer);
      }

      unsubscribers.forEach((unsubscribe) => unsubscribe());

      sessionListeners.forEach((unsubscribe) => unsubscribe());
      sessionListeners.clear();

      responseSubscription.remove();
    };
  }, [enabled, navigationRef]);
}
