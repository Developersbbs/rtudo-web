// app/api/razorpay-key/route.js
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";

export async function GET() {
  try {
    const docRef = doc(db, "settings", "razorpay");
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const data = snap.data();
    const key_id = data.key_id || data.keyId;

    if (!key_id) {
      return Response.json({ error: "Key ID missing" }, { status: 400 });
    }

    return Response.json({ key_id });
  } catch (err) {
    console.error("🔥 Error fetching Razorpay key:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
