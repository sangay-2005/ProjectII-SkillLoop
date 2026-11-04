import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Works out a mentor's average rating from all their reviews
// and saves it on their profile (shown on the cards and profile screens)
export const updateMentorRating = async (mentorId) => {
  const snap = await getDocs(query(collection(db, 'reviews'), where('mentorId', '==', mentorId)));

  const count = snap.size;
  let total = 0;
  snap.forEach((d) => {
    total += Number(d.data().rating) || 0;
  });

  // one decimal place, e.g. 4.5 (and 0 when there are no reviews)
  const average = count > 0 ? Math.round((total / count) * 10) / 10 : 0;

  await updateDoc(doc(db, 'users', mentorId), { rating: average, reviewsCount: count });
};