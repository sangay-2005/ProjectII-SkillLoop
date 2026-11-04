import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Motif from '../../components/Motif';
import OnboardingHero from '../../components/OnboardingHero';

const FEATURES = [
  {
    label: 'Connect', color: '#2D6A4F', bg: '#E8F5E9',
    path: 'M16,11c1.66,0 2.99,-1.34 2.99,-3S17.66,5 16,5s-3,1.34 -3,3S14.34,11 16,11zM8,11c1.66,0 2.99,-1.34 2.99,-3S9.66,5 8,5S5,6.34 5,8S6.34,11 8,11zM8,13c-2.33,0 -7,1.17 -7,3.5V19h14v-2.5C15,14.17 10.33,13 8,13z',
  },
  {
    label: 'Learn', color: '#E8A33D', bg: '#FBF0DC',
    path: 'M18,2H6C4.9,2 4,2.9 4,4v16c0,1.1 0.9,2 2,2h12c1.1,0 2,-0.9 2,-2V4C20,2.9 19.1,2 18,2zM18,20H6V4h5v8l2.5,-1.5L16,12V4h2V20z',
  },
  {
    label: 'Share', color: '#E8A33D', bg: '#FBF0DC',
    path: 'M11,9H9V2H7V9H5l3,3L11,9z M17,7v2h2v10H5v-2H3v2c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2V9C21,7.9 20.1,7 19,7H17z',
  },
  {
    label: 'Grow', color: '#2D6A4F', bg: '#E8F5E9',
    path: 'M7,14l-1.41,1.41L9,18.83l12,-12L19.59,5.42L9,16L7,14z M3,11h2v8H3V11z M10,11h2v8h-2V11z M17,11h2v8h-2V11z',
  },
];

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FAF7F0' }}>
      {/* soft accent circles, like Project-I */}
      <View
        style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: 100, backgroundColor: 'rgba(232,163,61,0.10)',
        }}
      />
      <View
        style={{
          position: 'absolute', bottom: -50, left: -50, width: 180, height: 180,
          borderRadius: 90, backgroundColor: 'rgba(45,106,79,0.08)',
        }}
      />

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24 }}>
        <Image source={require('../../../assets/logo.png')} style={{ width: 150, height: 137 }} resizeMode="contain" />

        <View style={{ marginVertical: 14 }}>
          <Motif width={60} />
        </View>

        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1F456D', textAlign: 'center', lineHeight: 32 }}>
          Share what you know{'\n'}Learn from your community
        </Text>

        <View style={{ marginVertical: 16 }}>
          <OnboardingHero size={170} />
        </View>

        <Text style={{ fontSize: 14, color: '#5F6368', textAlign: 'center', lineHeight: 21, marginBottom: 20 }}>
          Connect with people across Bhutan to exchange skills, knowledge and experiences.
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 28 }}>
          {FEATURES.map((f) => (
            <View key={f.label} style={{ alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 48, height: 48, borderRadius: 24, backgroundColor: f.bg,
                  justifyContent: 'center', alignItems: 'center',
                }}
              >
                <Svg width={24} height={24} viewBox="0 0 24 24">
                  <Path d={f.path} fill={f.color} />
                </Svg>
              </View>
              <Text style={{ fontSize: 12, color: '#1A1A1A', fontWeight: '600', marginTop: 6 }}>{f.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Signup')}
          style={{
            flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
            backgroundColor: '#1F456D', paddingVertical: 16, borderRadius: 14, width: '100%',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Get Started</Text>
          <Ionicons name="arrow-forward" size={18} color="#E8A33D" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 18 }}>
          <Text style={{ color: '#5F6368' }}>
            Already have an account? <Text style={{ color: '#E8A33D', fontWeight: 'bold' }}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}