import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import Avatar from './Avatar';
import StarRating from './StarRating';

const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Shows every review a mentor has received
export default function ReviewsSection({ mentorId }) {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'reviews'), where('mentorId', '==', mentorId)));
        const list = snap.docs.map((d) => d.data());
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // newest first
        setReviews(list);
      } catch (error) {
        console.log('Error loading reviews:', error.message);
      }
    };
    loadReviews();
  }, [mentorId]);

  return (
    <View
      style={{
        backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14,
        shadowColor: '#1F456D', shadowOpacity: 0.08, shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }, elevation: 3,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1F456D', marginBottom: 10 }}>
        Reviews ({reviews.length})
      </Text>

      {reviews.length === 0 && (
        <Text style={{ fontSize: 13, color: '#8D99AE', lineHeight: 19 }}>
          No reviews yet. Learners can leave one after their first session.
        </Text>
      )}

      {reviews.map((r, index) => (
        <View
          key={r.id}
          style={{
            paddingTop: index === 0 ? 0 : 12, marginTop: index === 0 ? 0 : 12,
            borderTopWidth: index === 0 ? 0 : 1, borderTopColor: '#EFE7D6',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar name={r.reviewerName} size={32} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ fontWeight: 'bold', color: '#1F456D' }}>{r.reviewerName}</Text>
              <Text style={{ fontSize: 11, color: '#8D99AE' }}>
                {r.skillName} · {formatDate(r.timestamp)}
              </Text>
            </View>
            <StarRating value={r.rating} size={14} />
          </View>
          {r.comment ? (
            <Text style={{ fontSize: 13, color: '#444', marginTop: 8, lineHeight: 19 }}>{r.comment}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}