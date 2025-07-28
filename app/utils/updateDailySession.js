import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/firebase/firebaseConfig';
import dayjs from 'dayjs';

export const updateDailySession = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const today = dayjs().format('YYYY-MM-DD');
    const dailyUsage = data.appUsage?.dailyUsage || [];
    const now = new Date().toISOString();

    const todayIndex = dailyUsage.findIndex((entry) => entry.date === today);

    if (todayIndex !== -1) {
      dailyUsage[todayIndex].sessionsCount += 1;
      dailyUsage[todayIndex].lastUpdated = now;
    } else {
      dailyUsage.push({
        date: today,
        sessionsCount: 1,
        timeSpent: 0,
        lastUpdated: now,
      });
    }

    await updateDoc(userRef, {
      'appUsage.dailyUsage': dailyUsage,
    });
  } catch (err) {
    console.error('Failed to update daily session:', err);
  }
};
