import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Curved navy header used at the top of every main screen.
// Optional: rightIcon + onRightPress add a round button in the top-right corner.
export default function ScreenHeader({ small, title, subtitle, rightIcon, onRightPress, children }) {
  // keeps the header below the status bar or camera cut-out on every phone
  const insets = useSafeAreaInsets();
  const topPadding = insets.top + 16;

  return (
    <LinearGradient
      colors={['#1F456D', '#163A5C']}
      style={{
        paddingTop: topPadding, paddingHorizontal: 20, paddingBottom: 22,
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
          borderRadius: 28, borderWidth: 8, borderColor: 'rgba(250,247,240,0.10)',
        }}
      />

      {rightIcon ? (
        <TouchableOpacity
          onPress={onRightPress}
          style={{
            position: 'absolute', top: topPadding - 4, right: 20, width: 42, height: 42, borderRadius: 21,
            backgroundColor: 'rgba(250,247,240,0.15)', justifyContent: 'center', alignItems: 'center',
          }}
        >
          <Ionicons name={rightIcon} size={22} color="#FAF7F0" />
        </TouchableOpacity>
      ) : null}

      <View style={{ paddingRight: rightIcon ? 52 : 0 }}>
        {small ? <Text style={{ color: '#E8C38A', fontSize: 14 }}>{small}</Text> : null}
        <Text style={{ color: '#FAF7F0', fontSize: 26, fontWeight: 'bold' }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: '#B9C4D0', fontSize: 13, marginTop: 4 }}>{subtitle}</Text>
        ) : null}
      </View>
      {children}
    </LinearGradient>
  );
}