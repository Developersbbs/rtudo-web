import { db } from "@/app/firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const createChatSession = async (uid) => {
  const chatRef = collection(db, "users", uid, "chatHistory");
  const newChat = await addDoc(chatRef, {
    createdAt: serverTimestamp(),
    messages: [],
  });
  return newChat.id;
};
