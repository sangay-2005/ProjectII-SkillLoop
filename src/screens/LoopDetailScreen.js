import { View, Text, StyleSheet } from 'react-native';

export default function LoopDetailScreen() {
  return (
    <View style={styles.center}>
      <Text>Loop Detail Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});