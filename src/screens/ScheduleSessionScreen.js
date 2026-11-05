
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  doc,
  getDoc,
  collection,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useOnline, warnOffline } from '../utils/connection';
import { sendPush } from '../utils/notifications';

const COLORS = {
  navy: '#1F456D',
  cream: '#FAF7F0',
  gold: '#E8A33D',
  green: '#2D6A4F',
  text: '#1A1A1A',
  muted: '#6B6B6B',
  border: '#E5E5E5',
  white: '#FFFFFF',
};

const DURATIONS = [30, 45, 60, 75, 90, 120];

const formatDate = (date) =>
  date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const formatTime = (date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;

export default function ScheduleSessionScreen({ route, navigation }) {
  const { requestId } = route.params;
  const myUid = auth.currentUser?.uid;
  const online = useOnline();

  const [loop, setLoop] = useState(null);
  const [partnerName, setPartnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('online');
  const [duration, setDuration] = useState(60);

  const [sessionDate, setSessionDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  });

  const [startTime, setStartTime] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() + 1, 0, 0, 0);
    return date;
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [platform, setPlatform] = useState('Google Meet');
  const [meetingLink, setMeetingLink] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationDetails, setLocationDetails] = useState('');

  useEffect(() => {
    let active = true;

    const loadLoop = async () => {
      if (!online) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'requests', requestId));

        if (!snap.exists()) {
          Alert.alert('Not available', 'This Loop could not be found.');
          navigation.goBack();
          return;
        }

        const data = snap.data();

        if (data.status !== 'accepted') {
          Alert.alert(
            'Unavailable',
            'Sessions can only be scheduled for an accepted Loop.'
          );
          navigation.goBack();
          return;
        }

        if (data.senderId !== myUid && data.receiverId !== myUid) {
          Alert.alert('Access denied', 'You are not part of this Loop.');
          navigation.goBack();
          return;
        }

        if (!active) return;

        setLoop(data);

        setPartnerName(
          data.senderId === myUid
            ? data.receiverName || 'Learning partner'
            : data.senderName || 'Learning partner'
        );

        setTopic(data.skillName || '');

        navigation.setOptions({ title: 'Schedule Session' });
      } catch (error) {
        Alert.alert('Error', 'Could not load Loop details. Please try again.');
        console.log('Load Loop error:', error.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadLoop();

    return () => {
      active = false;
    };
  }, [requestId, online]);

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setSessionDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const validateForm = () => {
    if (!topic.trim()) {
      Alert.alert('Missing topic', 'Please enter a session topic.');
      return false;
    }

    const scheduledDate = new Date(
      sessionDate.getFullYear(),
      sessionDate.getMonth(),
      sessionDate.getDate(),
      startTime.getHours(),
      startTime.getMinutes()
    );

    if (scheduledDate <= new Date()) {
      Alert.alert(
        'Invalid date or time',
        'Please choose a future date and time.'
      );
      return false;
    }

    if (mode === 'online') {
      if (!meetingLink.trim()) {
        Alert.alert('Missing link', 'Please enter the meeting link.');
        return false;
      }

      if (!/^https?:\/\/\S+$/i.test(meetingLink.trim())) {
        Alert.alert(
          'Invalid link',
          'Enter a valid meeting URL beginning with https:// or http://.'
        );
        return false;
      }
    }

    if (mode === 'in_person' && !locationName.trim()) {
      Alert.alert(
        'Missing location',
        'Please enter a public meeting location.'
      );
      return false;
    }

    return true;
  };

  const proposeSession = async () => {
    if (!online) {
      warnOffline();
      return;
    }

    if (!loop || !myUid || saving) return;

    if (!validateForm()) return;

    setSaving(true);

    try {
      const ref = doc(
        collection(db, 'requests', requestId, 'sessions')
      );

      const now = Date.now();

      // Save the session proposal first.
      await setDoc(ref, {
        topic: topic.trim(),
        description: description.trim(),
        mode,

        sessionDate: [
          sessionDate.getFullYear(),
          String(sessionDate.getMonth() + 1).padStart(2, '0'),
          String(sessionDate.getDate()).padStart(2, '0'),
        ].join('-'),

        startTime: formatTime(startTime),
        durationMinutes: duration,

        platform: mode === 'online' ? platform : '',
        meetingLink: mode === 'online' ? meetingLink.trim() : '',

        locationName: mode === 'in_person' ? locationName.trim() : '',
        locationDetails:
          mode === 'in_person' ? locationDetails.trim() : '',

        proposedBy: myUid,
        status: 'pending',
        confirmedBy: null,
        respondedBy: null,
        completedBy: null,
        completedAt: null,
        cancelledBy: null,
        createdAt: now,
        updatedAt: now,
      });

      // Find the other participant's UID.
      const partnerUid =
        loop.senderId === myUid
          ? loop.receiverId
          : loop.senderId;

      const proposerName =
        loop.senderId === myUid
          ? loop.senderName || 'Your learning partner'
          : loop.receiverName || 'Your learning partner';

      // Notify the other participant.
      await sendPush(
        partnerUid,
        'New Teaching Session Proposal',
        `${proposerName} proposed a session about ${topic.trim()}. Tap to view and respond.`,
        {
          type: 'session_proposal',
          requestId,
          sessionId: ref.id,
        }
      );

      Alert.alert(
        'Session proposed',
        `Your session proposal has been sent to ${partnerName}. It will appear as pending until they respond.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.log('Session proposal error:', error);

      Alert.alert(
        'Could not schedule',
        'The session could not be saved. Please check your connection and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading Loop details...</Text>
      </View>
    );
  }

  if (!loop) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>
          {online
            ? 'Loop details are unavailable.'
            : 'Connect to the internet to schedule a session.'}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.partnerCard}>
          <Ionicons
            name="people-outline"
            size={22}
            color={COLORS.green}
          />

          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.partnerLabel}>Scheduling with</Text>
            <Text style={styles.partnerName}>{partnerName}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Session details</Text>

        <Text style={styles.label}>Topic *</Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. Introduction to React Native"
          placeholderTextColor="#8D99AE"
          value={topic}
          onChangeText={setTopic}
          maxLength={100}
        />

        <Text style={styles.label}>Description (optional)</Text>

        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="What will this session cover?"
          placeholderTextColor="#8D99AE"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
        />

        <Text style={styles.sectionTitle}>Session type</Text>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'online' && styles.modeSelected,
            ]}
            onPress={() => setMode('online')}
          >
            <Ionicons
              name="videocam-outline"
              size={22}
              color={mode === 'online' ? COLORS.white : COLORS.navy}
            />

            <Text
              style={[
                styles.modeText,
                mode === 'online' && styles.modeTextSelected,
              ]}
            >
              Online
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'in_person' && styles.modeSelected,
            ]}
            onPress={() => setMode('in_person')}
          >
            <Ionicons
              name="location-outline"
              size={22}
              color={mode === 'in_person' ? COLORS.white : COLORS.navy}
            />

            <Text
              style={[
                styles.modeText,
                mode === 'in_person' && styles.modeTextSelected,
              ]}
            >
              In person
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'online' ? (
          <>
            <Text style={styles.label}>Meeting platform</Text>

            <View style={styles.choiceRow}>
              {['Google Meet', 'Zoom', 'Teams', 'Other'].map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setPlatform(item)}
                  style={[
                    styles.choice,
                    platform === item && styles.choiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      platform === item && styles.choiceTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Meeting link *</Text>

            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor="#8D99AE"
              value={meetingLink}
              onChangeText={setMeetingLink}
              autoCapitalize="none"
              keyboardType="url"
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Public meeting location *</Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. CST Library"
              placeholderTextColor="#8D99AE"
              value={locationName}
              onChangeText={setLocationName}
              maxLength={120}
            />

            <Text style={styles.label}>Additional details (optional)</Text>

            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="e.g. First-floor study area"
              placeholderTextColor="#8D99AE"
              value={locationDetails}
              onChangeText={setLocationDetails}
              multiline
              maxLength={300}
            />

            <View style={styles.safetyNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={COLORS.green}
              />

              <Text style={styles.safetyText}>
                Choose a public and safe meeting place. Avoid sharing private
                home addresses.
              </Text>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Date and time</Text>

        <Text style={styles.label}>Session date</Text>

        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={COLORS.navy}
          />

          <Text style={styles.pickerText}>{formatDate(sessionDate)}</Text>

          <Ionicons
            name="chevron-down"
            size={18}
            color={COLORS.muted}
          />
        </TouchableOpacity>

        {showDatePicker && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={sessionDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onValueChange={handleDateChange}
              onDismiss={() => setShowDatePicker(false)}
            />

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.pickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.label}>Start time</Text>

        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowTimePicker(!showTimePicker)}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={COLORS.navy}
          />

          <Text style={styles.pickerText}>{formatTime(startTime)}</Text>

          <Ionicons
            name="chevron-down"
            size={18}
            color={COLORS.muted}
          />
        </TouchableOpacity>

        {showTimePicker && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={startTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onValueChange={handleTimeChange}
              onDismiss={() => setShowTimePicker(false)}
            />

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.pickerDone}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.label}>Duration</Text>

        <View style={styles.choiceRow}>
          {DURATIONS.map((minutes) => (
            <TouchableOpacity
              key={minutes}
              onPress={() => setDuration(minutes)}
              style={[
                styles.choice,
                duration === minutes && styles.choiceSelected,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  duration === minutes && styles.choiceTextSelected,
                ]}
              >
                {minutes} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={COLORS.navy}
          />

          <Text style={styles.noticeText}>
            This is a proposal. Your partner must accept it before the session
            is confirmed.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!online || saving) && styles.disabledButton,
          ]}
          onPress={proposeSession}
          disabled={!online || saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons
                name="send-outline"
                size={18}
                color={COLORS.white}
              />

              <Text style={styles.submitText}>Send Session Proposal</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    padding: 24,
  },

  loadingText: {
    color: COLORS.muted,
    marginTop: 12,
    textAlign: 'center',
  },

  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 14,
    marginBottom: 24,
  },

  partnerLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },

  partnerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.green,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginTop: 12,
    marginBottom: 12,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 7,
    marginTop: 10,
  },

  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },

  multiline: {
    minHeight: 85,
    textAlignVertical: 'top',
  },

  modeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  modeButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  modeSelected: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  modeText: {
    color: COLORS.navy,
    fontWeight: '600',
  },

  modeTextSelected: {
    color: COLORS.white,
  },

  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },

  choice: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  choiceSelected: {
    backgroundColor: '#E8F0F8',
    borderColor: COLORS.navy,
  },

  choiceText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },

  choiceTextSelected: {
    color: COLORS.navy,
    fontWeight: 'bold',
  },

  safetyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },

  safetyText: {
    flex: 1,
    color: COLORS.green,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 8,
  },

  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },

  pickerText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },

  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginTop: 8,
    padding: 8,
  },

  pickerDone: {
    alignItems: 'flex-end',
    padding: 10,
  },

  pickerDoneText: {
    color: COLORS.navy,
    fontWeight: 'bold',
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0F8',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
  },

  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.navy,
    marginLeft: 8,
  },

  submitButton: {
    backgroundColor: COLORS.navy,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    marginTop: 20,
  },

  disabledButton: {
    opacity: 0.5,
  },

  submitText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
