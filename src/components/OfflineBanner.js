import { View, Text, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnline } from '../utils/connection';

// A dark strip at the top that appears only while there is no internet
export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  const topPadding = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;

  return (
    <View
      style={{
        backgroundColor: '#2B2B2B', paddingTop: topPadding + 4, paddingBottom: 8,
        paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 8 }}>
        You're offline. Showing saved data (view only)
      </Text>
    </View>
  );
}