import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const CATEGORIES = ['Technology', 'Music', 'Cooking', 'Arts', 'Dzongkha'];
const LEVELS = ['Beginner', 'Intermediate', 'Expert'];

// the preset skills from your Project-I profile setup
const PRESET_SKILLS = [
  'Photography', 'Dzongkha', 'Handicrafts', 'Coding', 'Traditional Cooking', 'Music',
  'Archery', 'Textile Weaving', 'Graphic Design', 'Gardening', 'Public Speaking',
];

export default function ProfileSetupScreen({ onDone }) {
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [teachSkills, setTeachSkills] = useState([]);
  const [learnSkills, setLearnSkills] = useState([]);
  const [levels, setLevels] = useState({}); // skill -> level
  const [customTeach, setCustomTeach] = useState('');
  const [customLearn, setCustomLearn] = useState('');
  const [saving, setSaving] = useState(false);

  // tap a chip to select it, tap again to remove it
  const toggleSkill = (list, setList, skill) => {
    if (list.includes(skill)) setList(list.filter((s) => s !== skill));
    else setList([...list, skill]);
  };

  // add a skill the user typed themselves
  const addCustomSkill = (text, setText, list, setList) => {
    const typed = text.trim();
    if (!typed) return;
    const skill = typed.charAt(0).toUpperCase() + typed.slice(1);
    const already = list.some((s) => s.toLowerCase() === skill.toLowerCase());
    if (!already) setList([...list, skill]);
    setText('');
  };

  const getFinalCategory = () => {
    if (category !== 'Other') return category;
    const typed = customCategory.trim();
    if (!typed) return '';
    const existing = CATEGORIES.find((c) => c.toLowerCase() === typed.toLowerCase());
    if (existing) return existing;
    return typed.charAt(0).toUpperCase() + typed.slice(1);
  };

  const handleSave = async () => {
    const finalCategory = getFinalCategory();

    if (!displayName.trim() || !location.trim() || !category) {
      Alert.alert('Missing info', 'Please enter your name, location and pick a category.');
      return;
    }
    if (!finalCategory) {
      Alert.alert('Missing category', 'Please type your own category name.');
      return;
    }
    if (teachSkills.length === 0 && learnSkills.length === 0) {
      Alert.alert('Add a skill', 'Please pick at least one skill you can teach or want to learn.');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;

      const skillLevels = {};
      teachSkills.forEach((skill) => {
        skillLevels[skill] = levels[skill] || 'Beginner';
      });

      await updateProfile(user, { displayName: displayName.trim() });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName.trim(),
        location: location.trim(),
        bio: bio.trim(),
        category: finalCategory,
        skillsToTeach: teachSkills,
        skillsToLearn: learnSkills,
        skillLevels: skillLevels,
        rating: 5,
        reviewsCount: 0,
        profileCompleted: true,
      });

      onDone();
    } catch (error) {
      Alert.alert('Could not save profile', error.message);
    } finally {
      setSaving(false);
    }
  };

  // one row of skill chips: presets first, then any custom ones the user added
  const skillChips = (list, setList, selectedColor) => {
    const all = [...PRESET_SKILLS, ...list.filter((s) => !PRESET_SKILLS.includes(s))];
    return (
      <View style={styles.chipRow}>
        {all.map((skill) => {
          const selected = list.includes(skill);
          return (
            <TouchableOpacity
              key={skill}
              onPress={() => toggleSkill(list, setList, skill)}
              style={[styles.chip, selected && { backgroundColor: selectedColor, borderColor: selectedColor }]}
            >
              {selected && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />}
              <Text style={[styles.chipText, selected && { color: '#fff' }]}>{skill}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const customInput = (text, setText, list, setList) => (
    <View style={styles.addRow}>
      <TextInput
        style={styles.addInput}
        placeholder="Add your own skill"
        placeholderTextColor="#8D99AE"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => addCustomSkill(text, setText, list, setList)}
        returnKeyType="done"
      />
      <TouchableOpacity style={styles.addButton} onPress={() => addCustomSkill(text, setText, list, setList)}>
        <Ionicons name="add" size={22} color="#1F456D" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Tell us about you</Text>
      <Text style={styles.subtitle}>This is what other members will see on your profile.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name / Username *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Pema"
          placeholderTextColor="#8D99AE"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Phuentsholing"
          placeholderTextColor="#8D99AE"
          value={location}
          onChangeText={setLocation}
        />

        <Text style={styles.label}>Short bio</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Tell others a little about yourself"
          placeholderTextColor="#8D99AE"
          multiline
          value={bio}
          onChangeText={setBio}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Main skill category *</Text>
        <View style={styles.chipRow}>
          {[...CATEGORIES, 'Other'].map((cat) => {
            const selected = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.chip, selected && { backgroundColor: '#1F456D', borderColor: '#1F456D' }]}
              >
                <Text style={[styles.chipText, selected && { color: '#fff' }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {category === 'Other' && (
          <TextInput
            style={styles.input}
            placeholder="Type your own category, e.g. Photography"
            placeholderTextColor="#8D99AE"
            value={customCategory}
            onChangeText={setCustomCategory}
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Skills I can teach</Text>
        {skillChips(teachSkills, setTeachSkills, '#2D6A4F')}
        {customInput(customTeach, setCustomTeach, teachSkills, setTeachSkills)}

        {teachSkills.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.smallLabel}>How well can you teach each one?</Text>
            {teachSkills.map((skill) => (
              <View key={skill} style={styles.levelRow}>
                <Text style={styles.levelSkill}>{skill}</Text>
                <View style={{ flexDirection: 'row' }}>
                  {LEVELS.map((lvl) => {
                    const selected = (levels[skill] || 'Beginner') === lvl;
                    return (
                      <TouchableOpacity
                        key={lvl}
                        onPress={() => setLevels({ ...levels, [skill]: lvl })}
                        style={[styles.levelChip, selected && { backgroundColor: '#E8A33D', borderColor: '#E8A33D' }]}
                      >
                        <Text style={[styles.levelText, selected && { color: '#1F456D', fontWeight: 'bold' }]}>{lvl}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Skills I want to learn</Text>
        {skillChips(learnSkills, setLearnSkills, '#E8A33D')}
        {customInput(customLearn, setCustomLearn, learnSkills, setLearnSkills)}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save and Continue'}</Text>
        {!saving && <Ionicons name="arrow-forward" size={18} color="#E8A33D" style={{ marginLeft: 8 }} />}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => signOut(auth)}>
        <Text style={styles.link}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F456D' },
  subtitle: { fontSize: 13, color: '#5F6368', marginTop: 4, marginBottom: 18 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: '#1F456D', shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  label: { fontSize: 14, fontWeight: 'bold', color: '#1F456D', marginBottom: 8, marginTop: 4 },
  smallLabel: { fontSize: 12, color: '#5F6368', marginBottom: 8 },
  input: {
    backgroundColor: '#FAF7F0', borderRadius: 12, padding: 12, fontSize: 15,
    color: '#1A1A1A', marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E5',
    backgroundColor: '#fff', paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, marginRight: 8, marginBottom: 8,
  },
  chipText: { fontSize: 13, color: '#1F456D', fontWeight: '600' },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  addInput: {
    flex: 1, backgroundColor: '#FAF7F0', borderRadius: 12, padding: 10, fontSize: 14, color: '#1A1A1A',
  },
  addButton: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#FBF0DC',
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  levelRow: { marginBottom: 10 },
  levelSkill: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  levelChip: {
    borderWidth: 1, borderColor: '#E5E5E5', paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 14, marginRight: 6,
  },
  levelText: { fontSize: 12, color: '#5F6368' },
  button: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1F456D', padding: 16, borderRadius: 14, marginTop: 6,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#D62828', textAlign: 'center', marginTop: 20 },
});