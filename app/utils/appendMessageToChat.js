import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";

export const appendMessageToChat = async (uid, chatId, message) => {
  const chatRef = doc(db, "users", uid, "chatHistory", chatId);
  const snap = await getDoc(chatRef);

  if (!snap.exists()) {
    // 🔹 Create chat doc if it doesn't exist
    await setDoc(chatRef, {
      messages: [message],
      lastUpdated: serverTimestamp(),
      preview: message.text,
      messagesCount: 1,
    });
  } else {
    const existingData = snap.data();
    const currentCount = existingData.messagesCount || 0;

    await updateDoc(chatRef, {
      messages: arrayUnion(message), // 🔹 Append message
      lastUpdated: serverTimestamp(), // 🔹 Update last updated
      preview: message.text,          // 🔹 Update last message preview
      messagesCount: currentCount + 1, // 🔹 Increment count
    });
  }
};
