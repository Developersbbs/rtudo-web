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
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDefaultUserSchema } from "./defaultUserSchema";

const createUserIfNotExists = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const dayjs = (await import("dayjs")).default;
  const today = dayjs().format("YYYY-MM-DD");
  const nowISO = new Date().toISOString();

  if (!snap.exists()) {
    // Gather onboarding data
    const onboarding = {
      nativeLanguage: localStorage.getItem("nativeLanguage"),
      motivation: localStorage.getItem("motivation"),
      englishLevel: localStorage.getItem("level"),
      source: localStorage.getItem("source"),
      learningTime: JSON.parse(localStorage.getItem("learningTime") || "{}"),
    };

    const defaultUserSchema = getDefaultUserSchema({ user, onboarding });
    await setDoc(userRef, defaultUserSchema, { merge: true });

    // Clean up localStorage
    localStorage.removeItem("nativeLanguage");
    localStorage.removeItem("motivation");
    localStorage.removeItem("level");
    localStorage.removeItem("source");
    localStorage.removeItem("learningTime");
  } else {
    const data = snap.data();
    const todayISO = nowISO;

    const xpData = data.xp || {
      availableXP: 0,
      totalXP: 0,
      history: [],
    };

    // Check if XP already given today
    const alreadyGivenToday = xpData.history.some(entry =>
      entry.date?.startsWith(today)
    );

    if (!alreadyGivenToday) {
      const dailyXP = 10;

      const newHistoryEntry = {
        date: todayISO,
        amount: dailyXP,
        reason: "Daily Login",
      };

      const updatedXP = {
        availableXP: (xpData.availableXP || 0) + dailyXP,
        totalXP: (xpData.totalXP || 0) + dailyXP,
        history: [newHistoryEntry, ...xpData.history].slice(0, 100), // Keep last 100
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
};


export const registerUser = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  await createUserIfNotExists(user);
  return user;
};

export const signInUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
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

export const logoutUser = () => signOut(auth);
export const observeAuthState = (callback) => onAuthStateChanged(auth, callback);
