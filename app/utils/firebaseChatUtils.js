import { db } from "@/app/firebase/firebaseConfig";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";

export const getChatHistoryList = async (uid) => {
  const chatRef = collection(db, "users", uid, "chatHistory");
  const q = query(chatRef, orderBy("lastUpdated", "desc"));
  const querySnapshot = await getDocs(q);

  const history = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const previewMessage = data.messages?.[0]?.text || "No messages yet";
    history.push({
      chatId: docSnap.id,
      preview: previewMessage,
      messagesCount: data.messages?.length || 0,
      lastUpdated: data.lastUpdated?.toDate?.() || new Date(),
    });
  });
  return history;
};

export const getChatById = async (uid, chatId) => {
  const chatDoc = doc(db, "users", uid, "chatHistory", chatId);
  const snap = await getDoc(chatDoc);
  return snap.exists() ? snap.data() : null;
};
