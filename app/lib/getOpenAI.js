// utils/getOpenAIInstance.js
import { OpenAI } from "openai";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";

export async function getOpenAIInstance() {
  try {
    const docRef = doc(db, "settings", "openai");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const apiKey = data.api_key || data.apiKey || null;

      if (!apiKey) throw new Error("API key is missing in Firestore");

      return new OpenAI({ apiKey });
    } else {
      throw new Error("OpenAI settings document not found in Firestore");
    }
  } catch (err) {
    console.error("🔥 Failed to get OpenAI API key:", err);
    throw new Error("Could not fetch OpenAI API key from Firestore");
  }
}
