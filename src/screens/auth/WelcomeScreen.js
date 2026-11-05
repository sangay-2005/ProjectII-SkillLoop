
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen({ navigation }) {
  const { height, width } = useWindowDimensions();
  const compact = height < 750;
  const narrow = width < 380;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />

      <View style={styles.container}>
        <View style={styles.brandSection}>
          <Image
            source={require('../../../assets/logo.png')}
            style={compact ? styles.logoSmall : styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandSubtitle}>
            A community built around sharing skills
          </Text>
        </View>

        <View style={styles.mainSection}>
          <View style={styles.hero}>
            <View style={styles.heroCircleLarge} />
            <View style={styles.heroCircleSmall} />

            <View style={styles.heroTopLabel}>
              <View style={styles.onlineDot} />
              <Text style={styles.heroTopText}>LEARN TOGETHER</Text>
            </View>

            <View style={styles.illustration}>
              <View style={styles.bookCircle}>
                <Ionicons name="book" size={38} color="#FFFFFF" />
              </View>

              <View style={styles.personCircle}>
                <Ionicons name="person" size={34} color="#1F456D" />
              </View>

              <View style={styles.sparkleOne}>
                <Ionicons name="sparkles" size={20} color="#D9902F" />
              </View>

              <View style={styles.sparkleTwo}>
                <Ionicons name="bulb" size={22} color="#2D6A4F" />
              </View>
            </View>

            <View style={styles.heroBottomLabel}>
              <Ionicons name="heart" size={14} color="#2D6A4F" />
              <Text style={styles.heroBottomText}>
                Skills are better when shared
              </Text>
            </View>
          </View>

          <View style={styles.messageSection}>
            <Text style={[styles.heading, narrow && styles.headingSmall]}>
              Learn something new.
            </Text>

            <Text style={[styles.headingGreen, narrow && styles.headingSmall]}>
              Share what you know.
            </Text>

            <Text style={styles.description}>
              Connect with people across Bhutan, exchange knowledge
              and grow together through shared skills.
            </Text>
          </View>

          <View style={styles.features}>
            <View style={styles.feature}>
              <View style={styles.featureIconGreen}>
                <Ionicons name="people-outline" size={17} color="#2D6A4F" />
              </View>
              <Text style={styles.featureText}>Connect</Text>
            </View>

            <View style={styles.feature}>
              <View style={styles.featureIconGold}>
                <Ionicons name="book-outline" size={17} color="#C17B20" />
              </View>
              <Text style={styles.featureText}>Learn</Text>
            </View>

            <View style={styles.feature}>
              <View style={styles.featureIconGreen}>
                <Ionicons name="trending-up-outline" size={17} color="#2D6A4F" />
              </View>
              <Text style={styles.featureText}>Grow</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#E8A33D" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Already have an account?
            </Text>
            <Text style={styles.loginLink}> Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },

  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
    paddingHorizontal: 26,
    paddingTop: 16,
    paddingBottom: 18,
  },

  brandSection: {
    alignItems: 'center',
    marginBottom: 14,
  },

  logo: {
    width: 130,
    height: 105,
  },

  logoSmall: {
    width: 110,
    height: 85,
  },

  brandSubtitle: {
    fontSize: 12,
    color: '#68717A',
    marginTop: 5,
    letterSpacing: 0.2,
  },

  mainSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  hero: {
    width: '100%',
    height: 190,
    borderRadius: 28,
    backgroundColor: '#E8EDE5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    marginBottom: 25,
  },

  heroCircleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#DCE7D8',
    top: 22,
    right: -45,
  },

  heroCircleSmall: {
    position: 'absolute',
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor: '#F6E9CF',
    bottom: -35,
    left: -20,
  },

  heroTopLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 19,
    gap: 7,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2D6A4F',
  },

  heroTopText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#2D6A4F',
  },

  illustration: {
    width: 150,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bookCircle: {
    width: 72,
    height: 72,
    borderRadius: 25,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },

  personCircle: {
    position: 'absolute',
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    right: 7,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#E8EDE5',
  },

  sparkleOne: {
    position: 'absolute',
    top: 0,
    right: 13,
  },

  sparkleTwo: {
    position: 'absolute',
    left: 4,
    bottom: 1,
  },

  heroBottomLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  heroBottomText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#476453',
  },

  messageSection: {
    alignItems: 'center',
  },

  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F456D',
    textAlign: 'center',
  },

  headingSmall: {
    fontSize: 21,
  },

  headingGreen: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D6A4F',
    textAlign: 'center',
    marginTop: 3,
  },

  description: {
    fontSize: 13,
    lineHeight: 21,
    color: '#68717A',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 5,
  },

  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 25,
    marginTop: 23,
  },

  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  featureIconGreen: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: '#E5EEE3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureIconGold: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: '#F8ECD8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F456D',
  },

  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },

  primaryButton: {
    height: 56,
    width: '100%',
    backgroundColor: '#1F456D',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 5,
  },

  loginText: {
    fontSize: 13,
    color: '#68717A',
  },

  loginLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D9902F',
  },
});
