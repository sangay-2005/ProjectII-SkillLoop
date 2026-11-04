import { View, Image } from 'react-native';

export default function AuthHero() {
  return (
    <View style={{ height: 260, alignItems: 'center', paddingTop: 56, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: 100, backgroundColor: 'rgba(232,163,61,0.10)',
        }}
      />
      <View
        style={{
          position: 'absolute', bottom: -20, left: -50, width: 180, height: 180,
          borderRadius: 90, backgroundColor: 'rgba(45,106,79,0.08)',
        }}
      />
      <Image source={require('../../assets/logo.png')} style={{ width: 170, height: 155 }} resizeMode="contain" />
    </View>
  );
}