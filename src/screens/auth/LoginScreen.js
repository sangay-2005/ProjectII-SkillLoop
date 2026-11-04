import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import AuthHero from '../../components/AuthHero';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // AppNavigator listens for the login and switches screens automatically
    } catch (error) {
      Alert.alert('Login failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <AuthHero />

      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to reconnect with your community</Text>

        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={20} color="#1F456D" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9A9384"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={20} color="#1F456D" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9A9384"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#7A7468" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
          {!loading && <Ionicons name="arrow-forward" size={18} color="#E8C38A" style={{ marginLeft: 8 }} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>
            Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', marginHorizontal: 20, marginTop: -40, borderRadius: 24, padding: 22,
    shadowColor: '#1F456D', shadowOpacity: 0.12, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1F456D' },
  subtitle: { fontSize: 13, color: '#7A7468', marginTop: 4, marginBottom: 20 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F1E5',
    borderRadius: 14, paddingHorizontal: 14, marginBottom: 12,
  },
  input: { flex: 1, paddingVertical: 14, marginLeft: 10, fontSize: 15, color: '#2A2620' },
  button: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1F456D', padding: 16, borderRadius: 14, marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { textAlign: 'center', marginTop: 20, color: '#7A7468' },
  linkBold: { color: '#C97C1F', fontWeight: 'bold' },
});