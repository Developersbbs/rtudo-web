import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { getDefaultUserSchema } from "./defaultUserSchema";
import { updateCurrentSubscriptionInfo } from "../utils/updateCurrentSubscriptionInfo ";

const createUserIfNotExists = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const dayjs = (await import("dayjs")).default;
  const today = dayjs().format("YYYY-MM-DD");
  const nowISO = new Date().toISOString();

  if (!snap.exists()) {
    const defaultUserSchema = getDefaultUserSchema({ user });
    await setDoc(userRef, defaultUserSchema, { merge: true });
    localStorage.clear();
  } else {
    const data = snap.data();
    const xpData = {
  availableXP: data.xp?.availableXP || 0,
  totalXP: data.xp?.totalXP || 0,
  history: Array.isArray(data.xp?.history) ? data.xp.history : [],
};


    const alreadyGivenToday = xpData.history.some(entry =>
      entry.date?.startsWith(today)
    );

    if (!alreadyGivenToday) {
      const dailyXP = 10;

      const newHistoryEntry = {
        date: nowISO,
        amount: dailyXP,
        reason: "Daily Login",
      };

      const updatedXP = {
        availableXP: (xpData.availableXP || 0) + dailyXP,
        totalXP: (xpData.totalXP || 0) + dailyXP,
        history: [newHistoryEntry, ...xpData.history].slice(0, 100),
      };

      await setDoc(
        userRef,
        {
          xp: updatedXP,
          updatedAt: nowISO,
          "appUsage.dailyUsage": arrayUnion({
            date: today,
            lastUpdated: nowISO,
            sessionsCount: 1,
            timeSpent: 0,
          }),
        },
        { merge: true }
      );
    } else {
      await setDoc(
        userRef,
        {
          updatedAt: nowISO,
          "appUsage.dailyUsage": arrayUnion({
            date: today,
            lastUpdated: nowISO,
            sessionsCount: 1,
            timeSpent: 0,
          }),
        },
        { merge: true }
      );
    }
  }

  // ✅ Always sync subscription info after checking user
  await updateCurrentSubscriptionInfo(user.uid);
};

export const registerUser = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  await createUserIfNotExists(user);
  return user;
};

export const signInUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth,email, password);
  const user = userCredential.user;
  await createUserIfNotExists(user);
  return user;
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  await createUserIfNotExists(user);
  return user;
};

export const resetPassword = async (email) => {
  return await sendPasswordResetEmail(auth, email);
};

export const logoutUser = async () => {
  await signOut(auth);

  // Reset theme to light
  if (typeof window !== 'undefined') {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
};

export const observeAuthState = (callback) => onAuthStateChanged(auth, callback);
