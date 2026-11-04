import { View, Text } from 'react-native';

// avatar_navy, avatar_gold, avatar_teal, avatar_green, avatar_purple from your colors.xml
const COLORS = ['#1B3A5C', '#E8A33D', '#00897B', '#43A047', '#8E24AA'];

// same hash as Kotlin's String.hashCode()
const hashCode = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
};

const getInitials = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
};

export default function Avatar({ name, size = 48 }) {
  const initials = getInitials(name);
  const color = COLORS[Math.abs(hashCode(name || '')) % COLORS.length];
  const outer = size + 10;

  return (
    <View
      style={{
        width: outer, height: outer, borderRadius: outer / 2,
        borderWidth: 2, borderColor: '#E8A33D',
        justifyContent: 'center', alignItems: 'center',
      }}
    >
      <View
        style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: color, justifyContent: 'center', alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: size * 0.38 }}>{initials}</Text>
      </View>
    </View>
  );
}