import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import StarRating from './StarRating';
import { updateMentorRating } from '../utils/reviews';

const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Lets a learner rate their mentor for one Loop (one review per Loop)
export default function ReviewCard({ loop, requestId, sessionCount }) {
  const [review, setReview] = useState(null); // my saved review, if any
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  // the review is stored under the Loop's id, so a Loop can only have one
  useEffect(() => {
    const loadReview = async () => {
      try {
        const snap = await getDoc(doc(db, 'reviews', requestId));
        if (snap.exists()) setReview(snap.data());
      } catch (error) {
        console.log('Error loading review:', error.message);
      } finally {
        setLoading(false);
      }
    };
    loadReview();
  }, [requestId]);

  const startEdit = () => {
    setStars(review.rating);
    setComment(review.comment || '');
    setEditing(true);
  };

  const saveReview = async () => {
    if (stars === 0) {
      Alert.alert('Pick a rating', 'Tap the stars to rate your mentor.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        id: requestId,
        requestId: requestId,
        mentorId: loop.receiverId,
        mentorName: loop.receiverName,
        reviewerId: auth.currentUser.uid,
        reviewerName: loop.senderName,
        skillName: loop.skillName,
        rating: stars,
        comment: comment.trim(),
        timestamp: Date.now(),
      };
      await setDoc(doc(db, 'reviews', requestId), data);
      await updateMentorRating(loop.receiverId); // refresh the mentor's average
      setReview(data);
      setEditing(false);
    } catch (error) {
      Alert.alert('Could not save review', error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete review?', 'Your rating will be removed from this mentor.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'reviews', requestId));
            await updateMentorRating(loop.receiverId);
            setReview(null);
            setStars(0);
            setComment('');
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  if (loading) return null;

  // a review needs at least one logged session first
  if (!review && sessionCount === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Rate your mentor</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="lock-closed-outline" size={18} color="#8D99AE" />
          <Text style={styles.hint}>Log at least one session to rate {loop.receiverName}.</Text>
        </View>
      </View>
    );
  }

  // my saved review
  if (review && !editing) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Your review of {loop.receiverName}</Text>
        <StarRating value={review.rating} size={22} />
        {review.comment ? <Text style={styles.comment}>"{review.comment}"</Text> : null}
        <Text style={styles.date}>{formatDate(review.timestamp)}</Text>

        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <TouchableOpacity style={styles.outlineButton} onPress={startEdit}>
            <Ionicons name="create-outline" size={16} color="#1F456D" />
            <Text style={styles.outlineText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.outlineButton, { borderColor: '#D62828' }]} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={16} color="#D62828" />
            <Text style={[styles.outlineText, { color: '#D62828' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // new review or editing an existing one
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{editing ? 'Edit your review' : `Rate ${loop.receiverName}`}</Text>
      <StarRating value={stars} onChange={setStars} size={34} />
      <TextInput
        style={styles.input}
        placeholder="Share a short comment (optional)"
        placeholderTextColor="#8D99AE"
        multiline
        value={comment}
        onChangeText={setComment}
      />
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity style={styles.saveButton} onPress={saveReview} disabled={saving}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            {saving ? 'Saving...' : editing ? 'Update Review' : 'Submit Review'}
          </Text>
        </TouchableOpacity>
        {editing && (
          <TouchableOpacity style={styles.outlineButton} onPress={() => setEditing(false)}>
            <Text style={styles.outlineText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginHorizontal: 20, marginBottom: 14,
    shadowColor: '#1F456D', shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1F456D', marginBottom: 10 },
  hint: { fontSize: 13, color: '#5F6368', marginLeft: 8, flex: 1 },
  comment: { fontSize: 14, color: '#444', fontStyle: 'italic', marginTop: 10, lineHeight: 20 },
  date: { fontSize: 11, color: '#8D99AE', marginTop: 6 },
  input: {
    backgroundColor: '#FAF7F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1A1A1A',
    height: 80, textAlignVertical: 'top', marginVertical: 12,
  },
  saveButton: {
    backgroundColor: '#1F456D', paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12, marginRight: 10,
  },
  outlineButton: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#1F456D',
    paddingVertical: 9, paddingHorizontal: 16, borderRadius: 12, marginRight: 10,
  },
  outlineText: { color: '#1F456D', fontWeight: '600', marginLeft: 4 },
});