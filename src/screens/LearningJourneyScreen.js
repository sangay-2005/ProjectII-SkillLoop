import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';

export default function LearningJourneyScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="My Learning Journey" subtitle="Your progress across every skill" />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Ionicons name="school-outline" size={56} color="#C97C1F" />
        <Text style={{ marginTop: 12, color: '#7A7468', textAlign: 'center' }}>
          Your skills and progress will appear here.
        </Text>
      </View>
    </View>
  );
}