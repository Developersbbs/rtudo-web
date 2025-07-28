// utils/fetchChatHistoryList.js
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";

export const fetchChatHistoryList = async (uid) => {
  const historyRef = collection(db, "users", uid, "chatHistory");
  const snapshot = await getDocs(historyRef);

  const history = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    history.push({
      id: doc.id, // YYYY-MM-DD
      lastUpdated: data.lastUpdated?.toDate(),
      messages: data.messages || [],
    });
  });

  // Sort by latest
  return history.sort((a, b) => b.lastUpdated - a.lastUpdated);
};
