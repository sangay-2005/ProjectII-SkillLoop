
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { loadCache, saveCache } from '../utils/cache';
import { useOnline, warnOffline } from '../utils/connection';
import { sendPush } from '../utils/notifications';

const formatDate = (dateString) => {
  if (!dateString) return 'Not set';

  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(
    'en-GB',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );
};

const getDateTime = (date, time) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes);
};

const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed':
      return '#2D6A4F';
    case 'pending':
      return '#B7791F';
    case 'completed':
      return '#1F456D';
    default:
      return '#D62828';
  }
};

export default function SessionDetailScreen({ route, navigation }) {
  const { requestId, sessionId } = route.params;
  const myUid = auth.currentUser?.uid;
  const online = useOnline();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newDate, setNewDate] = useState(new Date());
  const [newTime, setNewTime] = useState(new Date());

  const sessionRef = doc(
    db,
    'requests',
    requestId,
    'sessions',
    sessionId
  );

  const cacheKey = `${myUid}_sessions_${requestId}`;

  useEffect(() => {
    let active = true;
    let unsubscribe;

    const checkAccessAndLoad = async () => {
      if (!myUid) {
        navigation.goBack();
        return;
      }

      if (!online) {
        const cached = await loadCache(cacheKey);
        const found = cached?.find((item) => item.id === sessionId);

        if (active && found) setSession(found);
        if (active) setLoading(false);
        return;
      }

      try {
        const requestSnap = await getDoc(
          doc(db, 'requests', requestId)
        );

        if (!requestSnap.exists()) {
          Alert.alert('Unavailable', 'This Loop could not be found.');
          navigation.goBack();
          return;
        }

        const request = requestSnap.data();

        if (
          request.senderId !== myUid &&
          request.receiverId !== myUid
        ) {
          Alert.alert('Access denied', 'You are not part of this Loop.');
          navigation.goBack();
          return;
        }

        if (!active) return;

        unsubscribe = onSnapshot(
          sessionRef,
          async (snapshot) => {
            if (!active) return;

            if (!snapshot.exists()) {
              Alert.alert('Unavailable', 'This session no longer exists.');
              navigation.goBack();
              return;
            }

            const data = {
              ...snapshot.data(),
              id: snapshot.id,
            };

            setSession(data);

            const cached = (await loadCache(cacheKey)) || [];
            const updated = [
              ...cached.filter((item) => item.id !== sessionId),
              data,
            ];

            await saveCache(cacheKey, updated);

            if (active) setLoading(false);
          },
          (error) => {
            console.log('Session listener error:', error.message);
            setLoading(false);
          }
        );
      } catch (error) {
        console.log('Session loading error:', error.message);
        setLoading(false);
      }
    };

    checkAccessAndLoad();

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [requestId, sessionId, online]);

  const updateSession = async (changes) => {
    if (!online) {
      warnOffline();
      return false;
    }

    if (busy) return false;

    setBusy(true);

    try {
      await updateDoc(sessionRef, {
        ...changes,
        updatedAt: Date.now(),
      });

      return true;
    } catch (error) {
      Alert.alert('Update failed', error.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const acceptSession = () => {
    Alert.alert(
      'Accept Session',
      'Confirm that you can attend this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            const success = await updateSession({
              status: 'confirmed',
              confirmedBy: myUid,
              respondedBy: myUid,
            });

            if (!success) return;

            try {
              await sendPush(
                session.proposedBy,
                'Session Proposal Accepted',
                'Your learning partner accepted your teaching session proposal. Your session is now confirmed!',
                {
                  type: 'session_accepted',
                  requestId,
                  sessionId,
                }
              );
            } catch (error) {
              console.log(
                '[notifications] Acceptance notification failed:',
                error.message
              );
            }
          },
        },
      ]
    );
  };

  const declineSession = () => {
    Alert.alert(
      'Decline Session',
      'Are you sure you want to decline this proposal?',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            await updateSession({
              status: 'declined',
              respondedBy: myUid,
            });
          },
        },
      ]
    );
  };

  const cancelSession = () => {
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this session?',
      [
        { text: 'Keep session', style: 'cancel' },
        {
          text: 'Cancel session',
          style: 'destructive',
          onPress: async () => {
            await updateSession({
              status: 'cancelled',
              cancelledBy: myUid,
            });
          },
        },
      ]
    );
  };

  const completeSession = () => {
    Alert.alert(
      'Complete Session',
      'Mark this teaching session as completed?',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            await updateSession({
              status: 'completed',
              completedBy: myUid,
              completedAt: Date.now(),
            });
          },
        },
      ]
    );
  };

  const openMeeting = async () => {
    if (!session?.meetingLink) {
      Alert.alert(
        'No meeting link',
        'The proposer has not provided a meeting link.'
      );
      return;
    }

    try {
      await Linking.openURL(session.meetingLink);
    } catch {
      Alert.alert('Unable to open link', 'Please check the meeting link.');
    }
  };

  const openLocation = async () => {
    if (!session?.locationName) return;

    const place = encodeURIComponent(
      `${session.locationName} ${session.locationDetails || ''}`
    );

    const url = `https://www.google.com/maps/search/?api=1&query=${place}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open map', 'Please try again.');
    }
  };

  const openMeetingLink = async () => {
    if (!session?.meetingLink) return;

    try {
      await Linking.openURL(session.meetingLink);
    } catch {
      Alert.alert('Unable to open link', 'Please check the meeting link.');
    }
  };

  const startReschedule = () => {
    if (!online) {
      warnOffline();
      return;
    }

    const current = getDateTime(
      session.sessionDate,
      session.startTime
    );

    setNewDate(current);
    setNewTime(current);
    setShowDatePicker(true);
  };

  const saveReschedule = async () => {
    if (!online) {
      warnOffline();
      return;
    }

    const dateString = [
      newDate.getFullYear(),
      String(newDate.getMonth() + 1).padStart(2, '0'),
      String(newDate.getDate()).padStart(2, '0'),
    ].join('-');

    const timeString = [
      String(newTime.getHours()).padStart(2, '0'),
      String(newTime.getMinutes()).padStart(2, '0'),
    ].join(':');

    const updatedDate = getDateTime(dateString, timeString);

    if (updatedDate <= new Date()) {
      Alert.alert('Invalid time', 'Choose a future date and time.');
      return;
    }

    const success = await updateSession({
      sessionDate: dateString,
      startTime: timeString,
      status: 'pending',
      confirmedBy: null,
      respondedBy: null,
    });

    if (success) {
      Alert.alert(
        'Rescheduled',
        'The updated session time has been proposed.'
      );
    }
  };

  // Handle the selected rescheduling date.
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (!selectedDate) return;

    setNewDate(selectedDate);
    setShowTimePicker(true);
  };

  // Handle the selected rescheduling time.
  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (!selectedTime) return;

    setNewTime(selectedTime);

    setTimeout(() => {
      Alert.alert(
        'Confirm New Time',
        `${formatDate([
          newDate.getFullYear(),
          String(newDate.getMonth() + 1).padStart(2, '0'),
          String(newDate.getDate()).padStart(2, '0'),
        ].join('-'))} at ${selectedTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Propose', onPress: saveReschedule },
        ]
      );
    }, 300);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E8A33D" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>Session details are unavailable.</Text>
      </View>
    );
  }

  const isProposer = session.proposedBy === myUid;
  const isPending = session.status === 'pending';
  const isConfirmed = session.status === 'confirmed';

  const isFinished = [
    'completed',
    'cancelled',
    'declined',
  ].includes(session.status);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>SESSION STATUS</Text>

          <Text
            style={[
              styles.status,
              { color: getStatusColor(session.status) },
            ]}
          >
            {session.status?.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.title}>
          {session.topic || 'Teaching Session'}
        </Text>

        {!!session.description && (
          <Text style={styles.description}>
            {session.description}
          </Text>
        )}

        <View style={styles.divider} />

        <DetailRow
          icon="calendar-outline"
          label="Date"
          value={formatDate(session.sessionDate)}
        />

        <DetailRow
          icon="time-outline"
          label="Time"
          value={`${session.startTime || 'Not set'} • ${session.durationMinutes} minutes`}
        />

        <DetailRow
          icon={
            session.mode === 'online'
              ? 'videocam-outline'
              : 'location-outline'
          }
          label="Meeting type"
          value={session.mode === 'online' ? 'Online' : 'In-person'}
        />

        {session.mode === 'online' ? (
          <>
            <DetailRow
              icon="laptop-outline"
              label="Platform"
              value={session.platform || 'Not specified'}
            />

            {isConfirmed && (
              <View style={styles.meetingLinkContainer}>
                <Text style={styles.detailLabel}>MEETING LINK</Text>

                {session.meetingLink ? (
                  <TouchableOpacity
                    onPress={openMeetingLink}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.meetingLink}>
                      {session.meetingLink}
                    </Text>
                    <Text style={styles.linkHint}>
                      Tap to open meeting link
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.missingLink}>
                    No meeting link has been provided yet.
                  </Text>
                )}
              </View>
            )}
          </>
        ) : (
          <>
            <DetailRow
              icon="location-outline"
              label="Location"
              value={session.locationName || 'Not specified'}
            />

            {!!session.locationDetails && (
              <DetailRow
                icon="information-circle-outline"
                label="Location details"
                value={session.locationDetails}
              />
            )}
          </>
        )}
      </View>

      {isPending && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isProposer
              ? 'Waiting for response'
              : 'Respond to proposal'}
          </Text>

          <Text style={styles.description}>
            {isProposer
              ? 'The other participant has not responded yet.'
              : 'Review the proposed session and choose whether to accept it.'}
          </Text>

          {!isProposer && (
            <>
              <ActionButton
                label="Accept Session"
                icon="checkmark-circle-outline"
                onPress={acceptSession}
                disabled={busy}
                primary
              />

              <ActionButton
                label="Decline Session"
                icon="close-circle-outline"
                onPress={declineSession}
                disabled={busy}
                danger
              />
            </>
          )}

          {isProposer && (
            <ActionButton
              label="Propose New Time"
              icon="calendar-outline"
              onPress={startReschedule}
              disabled={busy}
            />
          )}

          <ActionButton
            label="Cancel Proposal"
            icon="trash-outline"
            onPress={cancelSession}
            disabled={busy}
            danger
          />
        </View>
      )}

      {isConfirmed && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Session Actions</Text>

          {session.mode === 'online' ? (
            <ActionButton
              label="Join Online Meeting"
              icon="videocam-outline"
              onPress={openMeeting}
              disabled={!session.meetingLink}
              primary
            />
          ) : (
            <ActionButton
              label="View Location"
              icon="map-outline"
              onPress={openLocation}
              primary
            />
          )}

          <ActionButton
            label="Mark as Completed"
            icon="checkmark-done-outline"
            onPress={completeSession}
            disabled={busy}
          />

          <ActionButton
            label="Cancel Session"
            icon="close-circle-outline"
            onPress={cancelSession}
            disabled={busy}
            danger
          />
        </View>
      )}

      {isFinished && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {session.status === 'completed'
              ? 'Session Completed'
              : session.status === 'cancelled'
                ? 'Session Cancelled'
                : 'Proposal Declined'}
          </Text>

          <Text style={styles.description}>
            {session.status === 'completed'
              ? 'This session has been marked as completed. Add a separate journal entry to record what was taught or learned.'
              : 'This session is no longer active.'}
          </Text>
        </View>
      )}

      {busy && (
        <ActivityIndicator
          color="#E8A33D"
          style={{ marginTop: 12 }}
        />
      )}

      {showDatePicker && (
        <DateTimePicker
          value={newDate}
          mode="date"
          minimumDate={new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={handleDateChange}
          onDismiss={() => setShowDatePicker(false)}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={newTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={handleTimeChange}
          onDismiss={() => setShowTimePicker(false)}
        />
      )}
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={19} color="#E8A33D" />

      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  disabled,
  primary,
  danger,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        primary && styles.primaryButton,
        danger && styles.dangerButton,
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons
        name={icon}
        size={19}
        color={primary || danger ? '#FFFFFF' : '#1F456D'}
      />

      <Text
        style={[
          styles.actionText,
          (primary || danger) && { color: '#FFFFFF' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    elevation: 2,
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusLabel: {
    color: '#8D99AE',
    fontSize: 11,
    fontWeight: 'bold',
  },

  status: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  title: {
    color: '#1F456D',
    fontSize: 21,
    fontWeight: 'bold',
    marginTop: 15,
  },

  description: {
    color: '#5F6368',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  divider: {
    height: 1,
    backgroundColor: '#EFE7D6',
    marginVertical: 16,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },

  detailLabel: {
    fontSize: 11,
    color: '#8D99AE',
    fontWeight: '600',
  },

  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    marginTop: 3,
  },

  meetingLinkContainer: {
    backgroundColor: '#F5F8FC',
    padding: 13,
    borderRadius: 12,
    marginBottom: 17,
  },

  meetingLink: {
    fontSize: 14,
    color: '#1F456D',
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginTop: 8,
  },

  linkHint: {
    fontSize: 11,
    color: '#2D6A4F',
    marginTop: 6,
  },

  missingLink: {
    fontSize: 13,
    color: '#D62828',
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F456D',
    marginBottom: 10,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F456D',
    marginTop: 12,
  },

  primaryButton: {
    backgroundColor: '#1F456D',
    borderColor: '#1F456D',
  },

  dangerButton: {
    backgroundColor: '#D62828',
    borderColor: '#D62828',
  },

  actionText: {
    color: '#1F456D',
    fontWeight: 'bold',
    marginLeft: 9,
  },
});
