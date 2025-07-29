import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export const updateCurrentSubscriptionInfo = async (uid) => {
  try {
    const subsRef = collection(db, "subscriptions");

    // Find all subscriptions for this user
    const q = query(subsRef, where("uid", "==", uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    // Find latest one by createdAt
    let latest = null;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (
        data?.createdAt &&
        (!latest || new Date(data.createdAt) > new Date(latest.createdAt))
      ) {
        latest = data;
      }
    });

    if (!latest) return;

    // ✅ Update the user document
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      currentPlan: latest.plan || "free",
      currentSubscriptionId: latest.razorpay_order_id || "",
    });
  } catch (err) {
    console.error("Failed to update current subscription info:", err);
  }
};
