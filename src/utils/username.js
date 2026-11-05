import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';

// Usernames are stored lowercase: letters, numbers and underscores, 3-20 characters.
// Uniqueness is guaranteed by a document in the "usernames" collection (doc id = the username).
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// use while typing: lowercases and drops anything that is not allowed
export const cleanUsername = (text) =>
  (text || '').toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '').slice(0, 20);

// returns an error message, or null when the username is fine
export const validateUsername = (username) => {
  if (!username) return 'Choose a username.';
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (!USERNAME_RE.test(username)) return 'Use only letters, numbers and underscores.';
  return null;
};

// true if nobody else owns this username (it is also "free" if it is already mine)
export const isUsernameAvailable = async (username, myUid) => {
  const snap = await getDoc(doc(db, 'usernames', username));
  return !snap.exists() || snap.data().uid === myUid;
};

// Reserves the username for this user and releases their old one.
// Runs as a transaction, so two people can never get the same name at the same moment.
// Throws Error('USERNAME_TAKEN') if somebody else already owns it.
export const claimUsername = async (username, uid, oldUsername) => {
  await runTransaction(db, async (tx) => {
    const newRef = doc(db, 'usernames', username);
    const newSnap = await tx.get(newRef);
    if (newSnap.exists() && newSnap.data().uid !== uid) {
      throw new Error('USERNAME_TAKEN');
    }

    // reads must come before writes inside a transaction
    let oldRef = null;
    let oldOwnedByMe = false;
    if (oldUsername && oldUsername !== username) {
      oldRef = doc(db, 'usernames', oldUsername);
      const oldSnap = await tx.get(oldRef);
      oldOwnedByMe = oldSnap.exists() && oldSnap.data().uid === uid;
    }

    if (!newSnap.exists()) tx.set(newRef, { uid, createdAt: Date.now() });
    if (oldOwnedByMe) tx.delete(oldRef);
  });
};
