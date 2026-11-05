
import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../../config/firebase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing information', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      Alert.alert('Login failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        'Email required',
        'Please enter your registered email address first.'
      );
      return;
    }

    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());

      Alert.alert(
        'Reset email sent',
        'A password reset link has been sent to your email address. Please check your inbox.'
      );
    } catch (error) {
      Alert.alert('Unable to send reset email', error.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={21} color="#1F456D" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.welcomeTag}>
              <View style={styles.tagDot} />
              <Text style={styles.tagText}>YOUR LEARNING COMMUNITY</Text>
            </View>

            <Text style={styles.title}>Welcome back.</Text>

            <Text style={styles.subtitle}>
              Pick up where you left off. Your next learning journey starts here.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Sign in to your account</Text>

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
                placeholder="Enter your password"
                placeholderTextColor="#9BA39D"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#718096"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotButton}
              onPress={handleForgotPassword}
              disabled={resetLoading}
              activeOpacity={0.7}
            >
              {resetLoading ? (
                <ActivityIndicator size="small" color="#2D6A4F" />
              ) : (
                <Text style={styles.forgotText}>Forgot Password?</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading || resetLoading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Log In</Text>
                  <Ionicons name="arrow-forward" size={19} color="#F2C36B" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to SkillLoop?</Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.7}
            >
              <Text style={styles.signupLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },

  flex: {
    flex: 1,
  },

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
    marginBottom: 17,
  },

  header: {
    alignItems: 'center',
    marginBottom: 29,
  },

  logo: {
    width: 105,
    height: 85,
    marginBottom: 10,
  },

  welcomeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EDE5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 13,
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
    fontSize: 29,
    lineHeight: 37,
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
    marginBottom: 22,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#405E50',
    marginBottom: 9,
  },

  inputRow: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9F5',
    borderWidth: 1,
    borderColor: '#E5EAE1',
    borderRadius: 13,
    paddingHorizontal: 14,
    marginBottom: 19,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    paddingVertical: 14,
    marginLeft: 11,
  },

  eyeButton: {
    padding: 5,
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -9,
    marginBottom: 18,
    paddingVertical: 4,
  },

  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D6A4F',
  },

  loginButton: {
    height: 55,
    borderRadius: 14,
    backgroundColor: '#1F456D',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  loginButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 25,
  },

  footerText: {
    fontSize: 13,
    color: '#68717A',
  },

  signupLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D6A4F',
    marginLeft: 5,
  },
});
