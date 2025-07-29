import { NextResponse } from "next/server";
import { getOpenAIInstance } from "@/app/lib/getOpenAI";

let openai = null;

export async function POST(req) {
  const { question, answer } = await req.json();

  try {
    // Lazy load OpenAI client
    if (!openai) openai = await getOpenAIInstance();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `
You are an IELTS Writing Task 2 examiner. You are given a QUESTION and a STUDENT ANSWER.

Your job is to:
1. First check if the answer is ON-TOPIC and addresses the specific question. If it is NOT relevant or does NOT address the question directly, return **0** and stop.

2. If it is relevant, evaluate it strictly based on IELTS writing band descriptors:
- Task Response (does it fully answer the question with clear ideas?)
- Coherence and Cohesion (logical structure, clear paragraphs, linking)
- Lexical Resource (vocabulary variety and accuracy)
- Grammatical Range and Accuracy (sentence structure, tenses, errors)

Then assign an overall score from **1 to 100** based on your judgment.

⚠️ VERY IMPORTANT: Only return the final number (e.g., 85 or 0). Do not include any explanation or words.
          `.trim(),
        },
        {
          role: "user",
          content: `QUESTION: ${question}\nANSWER: ${answer}`,
        },
      ],
    });

    const reply = completion.choices[0].message.content.trim();

    // Extract only number
    const score = parseInt(reply.match(/\d+/)?.[0] || "0");
    const result = score >= 60 ? "PASS" : "FAIL";

    return NextResponse.json({ result, score });
  } catch (error) {
    console.error("❌ OpenAI writing evaluation failed:", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
