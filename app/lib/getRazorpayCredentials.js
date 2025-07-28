import { getDoc, doc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";

export async function getRazorpayCredentials() {
  let key_id = process.env.RAZORPAY_KEY_ID;
  let key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    try {
      const docRef = doc(db, "settings", "razorpay");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        key_id = key_id || data.key_id || data.keyId;
        key_secret = key_secret || data.key_secret || data.keySecret;
      }
    } catch (error) {
      console.error("Error fetching Razorpay credentials from Firestore:", error);
    }
  }

  if (!key_id || !key_secret) {
    throw new Error("Razorpay credentials are not set in env or Firestore");
  }

  return { key_id, key_secret };
}
