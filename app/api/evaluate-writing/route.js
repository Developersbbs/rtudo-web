import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAIInstance } from "@/app/lib/getOpenAI";


const openai = await getOpenAIInstance(); // 🔑 Get key from Firestore


export async function POST(req) {
  const { question, answer } = await req.json();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `
You are an IELTS Writing Task 2 examiner. Your job is to evaluate if the response is **relevant** and then score it.

Step 1: If the answer is **off-topic** (does not address the question), return only this: **0**

Step 2: If the answer is relevant, evaluate it based on:
- Task Response
- Coherence and Cohesion
- Lexical Resource
- Grammar and Accuracy

Then return a score from 1 to 100.

⚠️ IMPORTANT: Respond with only the number (e.g., 85, 0). Do not write explanation or anything else.
          `.trim(),
        },
        {
          role: "user",
          content: `Question: ${question}\nAnswer: ${answer}`,
        },
      ],
    });

    const reply = completion.choices[0].message.content.trim();
    const score = parseInt(reply.match(/\d+/)?.[0] || "0");

    const result = score >= 60 ? "PASS" : "FAIL";

    return NextResponse.json({ result, score });
  } catch (error) {
    console.error("OpenAI writing evaluation failed:", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
