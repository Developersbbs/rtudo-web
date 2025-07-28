// /app/api/unlock-chapters/route.js

import { db } from "@/app/firebase/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  collection, // ✅ this was missing
} from "firebase/firestore";


export async function POST(req) {
  try {
    const body = await req.json();
    const {
      userId,
      planId,
      amount,
      currency,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (!userId || !planId || !razorpay_order_id || !razorpay_payment_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const userSubscriptionRef = doc(db, "users", userId, "subscriptions", "details");
    const existingSnap = await getDoc(userSubscriptionRef);

    const now = new Date();
    const startDate = now.toISOString();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30); // 30 days
    const endDateISO = endDate.toISOString();

    const currentPlan = existingSnap.exists() ? existingSnap.data() : null;

    if (
      currentPlan &&
      currentPlan.status === "active" &&
      new Date(currentPlan.endDate).getTime() > now.getTime() &&
      currentPlan.plan === planId
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "Plan already active" }),
        { status: 409 }
      );
    }

    const features =
      planId === "pro"
        ? {
            maxChapters: Infinity,
            unlimitedPractice: true,
            offlineAccess: true,
            prioritySupport: true,
            aiTutor: true,
          }
        : {
            maxChapters: 5,
            unlimitedPractice: false,
            offlineAccess: false,
            prioritySupport: false,
            aiTutor: false,
          };

    // ✅ 1. Save to global collection
    await addDoc(collection(db, "subscriptions"), {
      userId,
      plan: planId,
      amount,
      currency,
      startDate,
      endDate: endDateISO,
      status: "active",
      features,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      createdAt: serverTimestamp(),
    });

    // ✅ 2. Save to users/{uid}/subscriptions/details
    await setDoc(userSubscriptionRef, {
      plan: planId,
      amount,
      currency,
      startDate,
      endDate: endDateISO,
      isActive: true,
      status: "active",
      features,
      updatedAt: serverTimestamp(),
    });

    // ✅ 3. Save to users/{uid}
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        plan: planId,
        planExpiresAt: endDateISO,
        subscriptionStatus: "active",
      },
      { merge: true }
    );

    return new Response(
      JSON.stringify({ success: true, message: "Subscription activated" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error unlocking chapters:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
