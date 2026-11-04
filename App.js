import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import OfflineBanner from './src/components/OfflineBanner';

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <OfflineBanner />
      <View style={{ flex: 1 }}>
        <AppNavigator />
      </View>
    </View>
  );
}