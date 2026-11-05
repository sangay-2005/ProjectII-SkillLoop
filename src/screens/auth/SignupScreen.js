
import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import KeyboardScreen from '../../components/KeyboardScreen';

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing information', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Your passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      // AppNavigator will show the profile setup screen next.
    } catch (error) {
      Alert.alert('Sign up failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardScreen contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={21} color="#1F456D" />
      </TouchableOpacity>

      {/* Brand section */}
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.welcomeTag}>
          <View style={styles.tagDot} />
          <Text style={styles.tagText}>JOIN THE COMMUNITY</Text>
        </View>

        <Text style={styles.title}>Create your account.</Text>

        <Text style={styles.subtitle}>
          A place to learn new skills, share knowledge and grow together.
        </Text>
      </View>

      {/* Signup form */}
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Get started</Text>

        <Text style={styles.label}>Email address</Text>

        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={20} color="#2D6A4F" />

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#9BA39D"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <Text style={styles.label}>Password</Text>

        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={20} color="#2D6A4F" />

          <TextInput
            style={styles.input}
            placeholder="Create a password"
            placeholderTextColor="#9BA39D"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#718096"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm password</Text>

        <View style={styles.inputRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color="#2D6A4F"
          />

          <TextInput
            style={styles.input}
            placeholder="Re-enter your password"
            placeholderTextColor="#9BA39D"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <TouchableOpacity
          style={styles.signupButton}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.signupButtonText}>Create Account</Text>
              <Ionicons name="arrow-forward" size={19} color="#F2C36B" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Login link */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Text style={styles.loginLink}>Log In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FAF7F0',
    paddingHorizontal: 27,
    paddingTop: 20,
    paddingBottom: 28,
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EDE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  header: {
    alignItems: 'center',
    marginBottom: 25,
  },

  logo: {
    width: 105,
    height: 85,
    marginBottom: 9,
  },

  welcomeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EDE5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
    gap: 7,
  },

  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2D6A4F',
  },

  tagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#2D6A4F',
  },

  title: {
    fontSize: 27,
    lineHeight: 35,
    fontWeight: '800',
    color: '#1F456D',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 21,
    color: '#68717A',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 295,
  },

  form: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 21,
    borderWidth: 1,
    borderColor: '#EAECE5',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F456D',
    marginBottom: 19,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#405E50',
    marginBottom: 8,
  },

  inputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9F5',
    borderWidth: 1,
    borderColor: '#E5EAE1',
    borderRadius: 13,
    paddingHorizontal: 14,
    marginBottom: 17,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    paddingVertical: 13,
    marginLeft: 11,
  },

  eyeButton: {
    padding: 5,
  },

  signupButton: {
    height: 55,
    borderRadius: 14,
    backgroundColor: '#1F456D',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 5,
  },

  signupButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 23,
  },

  footerText: {
    fontSize: 13,
    color: '#68717A',
  },

  loginLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D6A4F',
    marginLeft: 5,
  },
});
