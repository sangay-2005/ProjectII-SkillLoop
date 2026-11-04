import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Curved navy header used at the top of every main screen
export default function ScreenHeader({ small, title, subtitle, children }) {
  return (
    <LinearGradient
      colors={['#1F456D', '#163A5C']}
      style={{
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 22,
        borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden',
      }}
    >
      {/* decorative loop rings */}
      <View
        style={{
          position: 'absolute', top: -35, right: -35, width: 150, height: 150,
          borderRadius: 75, borderWidth: 18, borderColor: 'rgba(232,163,61,0.30)',
        }}
      />
      <View
        style={{
          position: 'absolute', top: 40, right: 60, width: 56, height: 56,
          borderRadius: 28, borderWidth: 8, borderColor: 'rgba(250,246,238,0.10)',
        }}
      />

      {small ? <Text style={{ color: '#E8C38A', fontSize: 14 }}>{small}</Text> : null}
      <Text style={{ color: '#FAF7F0', fontSize: 26, fontWeight: 'bold' }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: '#B9C4D0', fontSize: 13, marginTop: 4 }}>{subtitle}</Text>
      ) : null}
      {children}
    </LinearGradient>
  );
}