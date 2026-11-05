
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// "HH:mm" (24h, how we store it) -> "9:00 AM" (how we show it)
export const formatTime = (value) => {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const toDate = (value) => {
  const [h, m] = (value || '09:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

const fromDate = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// True when the end time is after the start time
export const isValidWindow = (start, end) => !!start && !!end && start < end;

// Format availability
export const formatAvailability = (details = {}) => {
  const days = details.availabilityDays || [];
  if (!days.length) return null;
  const ordered = DAYS.filter((d) => days.includes(d)).join(', ');
  if (!details.availabilityStart || !details.availabilityEnd) return ordered;
  return `${ordered} · ${formatTime(details.availabilityStart)} – ${formatTime(details.availabilityEnd)}`;
};

// A tappable card showing the time
function TimeField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value),
        mode: 'time',
        is24Hour: false,
        onValueChange: (event, date) => {
          if (date) onChange(fromDate(date));
        },
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.timeBox}
        onPress={openPicker}
        activeOpacity={0.8}
      >
        <Text style={styles.timeLabel}>{label}</Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={20} color="#2D6A4F" />
          <Text style={styles.timeValue}>{formatTime(value)}</Text>
        </View>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.backdrop}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setOpen(false)}
            />

            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{label} time</Text>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text style={styles.done}>Done</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={toDate(value)}
                mode="time"
                display="spinner"
                minuteInterval={5}
                themeVariant="light"
                textColor="#1A1A1A"
                onValueChange={(event, date) => {
                  if (date) onChange(fromDate(date));
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

// Days of the week + start/end time
export default function AvailabilityPicker({
  days,
  setDays,
  start,
  setStart,
  end,
  setEnd,
}) {
  const toggleDay = (day) =>
    setDays(days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day]);

  const invalid = days.length > 0 && !isValidWindow(start, end);

  const quick = (label, list) => (
    <TouchableOpacity
      key={label}
      style={styles.quick}
      onPress={() => setDays(list)}
    >
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View>
      <Text style={styles.subLabel}>Which days can you teach?</Text>

      <View style={styles.dayWrap}>
        {DAYS.map((day) => {
          const selected = days.includes(day);

          return (
            <TouchableOpacity
              key={day}
              onPress={() => toggleDay(day)}
              style={[styles.day, selected && styles.daySelected]}
            >
              {selected && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[styles.dayText, selected && { color: '#fff' }]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.quickRow}>
        <Text style={styles.quickLabel}>Quick pick:</Text>
        {quick('Weekdays', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])}
        {quick('Weekends', ['Sat', 'Sun'])}
        {quick('Every day', DAYS)}
        {days.length > 0 && quick('Clear', [])}
      </View>

      <Text style={[styles.subLabel, { marginTop: 14 }]}>
        Between which times?
      </Text>

      <View style={{ flexDirection: 'row' }}>
        <TimeField label="From" value={start} onChange={setStart} />
        <View style={{ width: 10 }} />
        <TimeField label="To" value={end} onChange={setEnd} />
      </View>

      {invalid && (
        <Text style={styles.error}>
          The end time must be after the start time.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 8,
  },
  dayWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  daySelected: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F456D',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 2,
  },
  quickLabel: {
    fontSize: 12,
    color: '#5F6368',
    marginRight: 8,
    marginBottom: 6,
  },
  quick: {
    backgroundColor: '#FBF0DC',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 6,
  },
  quickText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B7791F',
  },
  timeBox: {
    flex: 1,
    backgroundColor: '#FAF7F0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5F6368',
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F456D',
    marginLeft: 8,
  },
  error: {
    color: '#D62828',
    fontSize: 12,
    marginTop: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F456D',
  },
  done: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C97C1F',
  },
});
