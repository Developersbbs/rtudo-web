// firebase/storeUser.js
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Safely stores user data in Firestore.
 * Automatically adds `updatedAt` timestamp.
 */
export const storeUserInFirestore = async (uid, data) => {
  if (!uid || !data || typeof data !== 'object') return;

  const userDocRef = doc(db, 'users', uid);

  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(userDocRef, payload, { merge: true });
    console.log("✅ User data saved for:", uid);
  } catch (error) {
    console.error("❌ Error saving user data:", error);
  }
};
