import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import dayjs from "dayjs";

export const handleXPOnLogin = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);
  const today = dayjs().format("YYYY-MM-DD");

  if (!docSnap.exists()) return;

  const userData = docSnap.data();
  const lastLogin = userData.lastLoginDate;
  let newXP = 0;

  // First login bonus
  if (!userData.hasReceivedWelcomeBonus) {
    newXP += 250;
    await updateDoc(userRef, {
      hasReceivedWelcomeBonus: true,
    });
  }

  // Daily login XP
  if (lastLogin !== today) {
    newXP += 10;
  }

  if (newXP > 0) {
    await updateDoc(userRef, {
      availableXP: (userData.availableXP || 0) + newXP,
      totalXP: (userData.totalXP || 0) + newXP,
      [`xpHistory.${today}.earned`]: (userData.xpHistory?.[today]?.earned || 0) + newXP,
      [`xpHistory.${today}.source.daily`]: (userData.xpHistory?.[today]?.source?.daily || 0) + (newXP === 10 ? 10 : 0),
      lastLoginDate: today,
    });
  }
};
