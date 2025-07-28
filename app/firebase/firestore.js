import { db } from './firebaseConfig';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  arrayUnion,
  serverTimestamp,
  increment,
} from 'firebase/firestore';

/* ----------------------------- 🔹 Constants ----------------------------- */
const XP_REWARDS = {
  lesson: 25,
  chapter: 100,
  dailyLogin: 10,
  welcomeBonus: 250,
};

/* ---------------------------- 🔹 Save User Data ---------------------------- */
export const saveUserData = async (uid, data) => {
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, data, { merge: true });
};

/* ---------------------------- 🔹 Chat Session ---------------------------- */
export const createChatSession = async (uid, mode = "chat") => {
  const chatRef = collection(db, `users/${uid}/chatHistory`);
  const newChatDoc = await addDoc(chatRef, {
    startTime: serverTimestamp(),
    lastUpdated: serverTimestamp(),
    mode,
    messages: [],
  });
  return newChatDoc.id;
};

export const appendMessageToChat = async (uid, chatId, message) => {
  const chatDocRef = doc(db, `users/${uid}/chatHistory/${chatId}`);
  await updateDoc(chatDocRef, {
    messages: arrayUnion({
      id: Date.now().toString(),
      text: message.text,
      isUser: message.isUser,
      isVoice: message.isVoice || false,
      timestamp: new Date(),
    }),
    lastUpdated: new Date(),
  });
};

export const fetchChatHistory = async (uid, mode = "chat") => {
  const chatRef = collection(db, `users/${uid}/chatHistory`);
  const q = query(chatRef, where("mode", "==", mode), orderBy("startTime", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/* ------------------------ 🔹 Save Subscription Data ------------------------ */
export const saveSubscriptionData = async (userId, subscriptionData, features) => {
  if (!userId || !subscriptionData) {
    console.error("❌ Missing required subscription data");
    return;
  }

  const globalData = {
    ...subscriptionData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const userSubRef = doc(db, `users/${userId}/subscriptions`, 'details');
  const userSubData = {
    plan: subscriptionData.planId,
    amount: subscriptionData.amount,
    currency: subscriptionData.currency,
    startDate: subscriptionData.startDate,
    endDate: subscriptionData.endDate,
    isActive: true,
    features,
    updatedAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, 'subscriptions'), globalData);
    await setDoc(userSubRef, userSubData, { merge: true });
    console.log("✅ Subscription saved successfully");
  } catch (err) {
    console.error("❌ Error saving subscription data:", err);
  }
};



/* ------------------------ 🔹 User Progress Reference ------------------------ */
const getUserProgressRef = (userId) => doc(db, "users", userId, "progress", "chapters");

/* ------------------------- ✅ Mark Lesson Completed ------------------------ */
export const markLessonCompleted = async (userId, lessonId, chapterId, totalLessons) => {
  if (!userId || !lessonId || !chapterId || !totalLessons) return false;

  const progressRef = getUserProgressRef(userId);
  const userRef = doc(db, "users", userId);
  const lessonKey = `${chapterId}-${lessonId}`;

  try {
    const progressSnap = await getDoc(progressRef);
    const userSnap = await getDoc(userRef);

    const completedLessons = progressSnap.exists()
      ? progressSnap.data().completedLessons || []
      : [];

    const alreadyCompleted = completedLessons.some(
      (item) => typeof item === "object" && item.key === lessonKey
    );

    if (!alreadyCompleted) {
      // Create document if not exists
      if (!progressSnap.exists()) {
        await setDoc(progressRef, {
          completedLessons: [],
          completedLessonsCount: 0,
          completedExams: [],
          completedChapters: [],
        });
      }

      // Add lesson without timestamp
      await updateDoc(progressRef, {
        completedLessons: arrayUnion({ key: lessonKey }),
      });

      // Add timestamp manually
      const snap = await getDoc(progressRef);
      const lessons = snap.data().completedLessons || [];

      const updatedLessons = lessons.map((lesson) =>
        lesson.key === lessonKey ? { ...lesson, completedAt: new Date() } : lesson
      );

      await updateDoc(progressRef, {
        completedLessons: updatedLessons,
        completedLessonsCount: increment(1),
        lastCompletedAt: new Date(),
        updatedAt: new Date(),
      });

      // Add XP for user
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          availableXP: increment(XP_REWARDS.lesson),
          totalXP: increment(XP_REWARDS.lesson),
          xpHistory: arrayUnion({
            date: new Date(),
            amount: XP_REWARDS.lesson,
            reason: "Lesson Completed",
            lessonId,
            chapterId,
          }),
        });
      }

      // ✅ Check if chapter can now be marked as completed
      await markChapterCompletedIfEligible(userId, chapterId, totalLessons);

      return true;
    } else {
      console.log("⚠️ Lesson already marked complete");
      return false;
    }
  } catch (err) {
    console.error("❌ Error marking lesson complete:", err);
    return false;
  }
};

/* -------------------------- ✅ Mark Exam Completed -------------------------- */
export const markChapterExamCompleted = async (uid, chapterId) => {
  try {
    const progressRef = getUserProgressRef(uid);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) return;

    const completedExams = progressSnap.data().completedExams || [];

    if (!completedExams.includes(chapterId)) {
      await updateDoc(progressRef, {
        completedExams: arrayUnion(chapterId),
        updatedAt: new Date(),
      });

      console.log("✅ Exam marked complete:", chapterId);

      // ✅ Also check if chapter can be marked now
      const totalLessons = await getLessonCountForChapter(chapterId);
      await markChapterCompletedIfEligible(uid, chapterId, totalLessons);
    }
  } catch (error) {
    console.error("❌ Failed to mark exam completed:", error);
  }
};

/* ----------------------- ✅ Mark Chapter Completed ----------------------- */
export const markChapterCompletedIfEligible = async (uid, chapterId, totalLessons) => {
  try {
    const progressRef = getUserProgressRef(uid);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) return false;

    const data = progressSnap.data();
    const completedLessons = data.completedLessons || [];
    const completedExams = data.completedExams || [];
    const completedChapters = data.completedChapters || [];

    const completedLessonCount = completedLessons.filter(
      (item) => item.key?.startsWith(`${chapterId}-`)
    ).length;

    const hasCompletedAllLessons = completedLessonCount === totalLessons;
    const hasCompletedExam = completedExams.includes(chapterId);
    const alreadyCompleted = completedChapters.includes(chapterId);

    console.log("🔍 Checking chapter completion:");
    console.log({ chapterId, completedLessonCount, totalLessons, hasCompletedExam });

    if (hasCompletedAllLessons && hasCompletedExam && !alreadyCompleted) {
      await updateDoc(progressRef, {
        completedChapters: arrayUnion(chapterId),
        updatedAt: new Date(),
      });

      console.log("✅ Chapter marked completed:", chapterId);
      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Error in markChapterCompletedIfEligible:", error);
    return false;
  }
};

/* --------------------- 🔹 Get Total Lessons in Chapter --------------------- */
const getLessonCountForChapter = async (chapterId) => {
  const lessonsSnap = await getDocs(collection(db, "chapters", chapterId, "lessons"));
  return lessonsSnap.size;
};

/* ----------------------------- 🔹 Get Progress ----------------------------- */
export const getUserProgress = async (userId) => {
  if (!userId) return null;
  try {
    const progressRef = getUserProgressRef(userId);
    const snap = await getDoc(progressRef);
    return snap.exists() ? snap.data() : {
      completedLessons: [],
      completedExams: [],
      completedChapters: [],
    };
  } catch (err) {
    console.error("❌ Error fetching user progress:", err);
    return null;
  }
};