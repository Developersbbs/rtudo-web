import Razorpay from "razorpay";
import { getRazorpayCredentials } from "@/app/lib/getRazorpayCredentials";
export async function POST(request) {
  try {
    const { planId, amount, currency = "INR" } = await request.json();

    if (!planId || !amount) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const planDetails = {
      basic: { name: "Basic Plan", chaptersUnlocked: 5 },
      pro: { name: "Pro Plan", chaptersUnlocked: -1 },
    };

    if (!planDetails[planId]) {
      return Response.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    // Fetch Razorpay credentials dynamically
    const { key_id, key_secret } = await getRazorpayCredentials();

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const options = {
      amount: amount, // in paise, already multiplied on frontend
      currency,
      receipt: `receipt_${planId}_${Date.now()}`,
      notes: {
        planId,
        planName: planDetails[planId].name,
        chaptersUnlocked: planDetails[planId].chaptersUnlocked,
      },
    };

    const order = await razorpay.orders.create(options);

    return Response.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return Response.json(
      {
        error: "Failed to create order",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
