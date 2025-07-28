import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import dayjs from "dayjs";

export const updateXP = async (userId, amount = 15, reason = "practice-exam") => {
  const userRef = doc(db, "users", userId);
  const today = dayjs().format("YYYY-MM-DD");
  const nowISO = new Date().toISOString();

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) return;

    const data = userDoc.data();
    const availableXP = data.availableXP || 0;
    const totalXP = data.totalXP || 0;
    const xpHistory = data.xpHistory || {};
    const todayXP = xpHistory[today] || { earned: 0, source: {} };

    todayXP.earned += amount;
    todayXP.source[reason] = (todayXP.source[reason] || 0) + amount;

    transaction.update(userRef, {
      availableXP: availableXP + amount,
      totalXP: totalXP + amount,
      updatedAt: nowISO,
      [`xpHistory.${today}`]: todayXP,
    });
  });
};
