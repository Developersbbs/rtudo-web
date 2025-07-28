// utils/saveChatMessage.js
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import dayjs from "dayjs";

export const saveChatMessage = async ({ uid, message, isUser, isVoice = false }) => {
  const today = dayjs().format("YYYY-MM-DD");
  const chatRef = doc(db, "users", uid, "chatHistory", today);
  const snapshot = await getDoc(chatRef);

  const messageObj = {
    id: Date.now().toString(),
    isUser,
    isVoice,
    text: message,
    timestamp: new Date(),
  };

  if (!snapshot.exists()) {
    await setDoc(chatRef, {
      mode: "chat",
      startTime: new Date(),
      lastUpdated: new Date(),
      messages: [messageObj],
    });
  } else {
    const existingData = snapshot.data();
    await updateDoc(chatRef, {
      lastUpdated: new Date(),
      messages: [...existingData.messages, messageObj],
    });
  }
};
