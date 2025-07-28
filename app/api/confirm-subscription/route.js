import { db } from '@/app/firebase/firebaseConfig';
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const {
      planId,
      amount,
      currency,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
    } = await req.json();

    if (!planId || !amount || !razorpay_order_id || !razorpay_payment_id || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const planNames = {
      basic: 'Basic',
      pro: 'Pro',
    };

    const features = {
      basic: {
        aiTutor: false,
        maxChapters: 5,
        offlineAccess: false,
        prioritySupport: false,
        unlimitedPractice: false,
      },
      pro: {
        aiTutor: true,
        maxChapters: Infinity,
        offlineAccess: true,
        prioritySupport: true,
        unlimitedPractice: true,
      },
    };

    const now = new Date();
    const startDate = now.toISOString();

    const endDateObj = new Date();
    endDateObj.setMonth(endDateObj.getMonth() + 1);
    const endDate = endDateObj.toISOString();

    const subscriptionData = {
      amount,
      currency,
      duration: 'month',
      startDate,
      endDate,
      orderId: razorpay_order_id,
      paymentDetails: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      },
      paymentId: razorpay_payment_id,
      planId,
      planName: planNames[planId] || '',
      signature: razorpay_signature,
      status: 'active',
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // ✅ Save in global collection
    await addDoc(collection(db, 'subscriptions'), subscriptionData);

    // ✅ Save in user-specific path
    const userSubRef = doc(db, 'users', userId, 'subscriptions', 'details');
    await setDoc(userSubRef, {
      amount,
      currency,
      startDate,
      endDate,
      isActive: true,
      plan: planId,
      features: features[planId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 });
  }
}
