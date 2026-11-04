import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

export default function MentorCard({ mentor, onPress }) {
  const skills = (mentor.skillsToTeach || []).slice(0, 3);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 20, padding: 14, marginHorizontal: 20, marginBottom: 12,
        shadowColor: '#1F456D', shadowOpacity: 0.08, shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }, elevation: 3,
      }}
    >
      <Avatar name={mentor.displayName} size={50} />

      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F456D' }}>
          {mentor.displayName || 'Unnamed user'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Ionicons name="location-outline" size={13} color="#7A7468" />
          <Text style={{ fontSize: 12, color: '#7A7468', marginLeft: 3 }}>
            {mentor.location || 'Bhutan'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {skills.map((skill) => (
            <View
              key={skill}
              style={{
                backgroundColor: '#E8F5E9', paddingVertical: 3, paddingHorizontal: 10,
                borderRadius: 12, marginRight: 6, marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: '#2D6A4F', fontWeight: '600' }}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBF0DC',
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
          }}
        >
          <Ionicons name="star" size={12} color="#C97C1F" />
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#C97C1F', marginLeft: 3 }}>
            {mentor.rating != null ? Number(mentor.rating).toFixed(1) : '-'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#B9B2A3" style={{ marginTop: 14 }} />
      </View>
    </TouchableOpacity>
  );
}