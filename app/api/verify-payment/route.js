import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getRazorpayCredentials } from '@/app/lib/getRazorpayCredentials';

async function verifyRazorpaySignature(orderId, paymentId, signature, keySecret) {
  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return generatedSignature === signature;
}

export async function POST(request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      userId, // ✅ Make sure it's received from frontend
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId || !userId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { key_id, key_secret } = await getRazorpayCredentials();
    const razorpay = new Razorpay({ key_id, key_secret });

    const isSignatureValid = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      key_secret
    );

    if (!isSignatureValid) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== 'captured') {
      return new Response(JSON.stringify({ success: false, error: 'Payment not captured' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        planId,
        userId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Payment verification failed:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal Server Error', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
