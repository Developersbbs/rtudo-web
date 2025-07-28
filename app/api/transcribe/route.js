import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { getOpenAIInstance } from "@/app/lib/getOpenAI";

const openai = await getOpenAIInstance(); // 🔑 Get key from Firestore


export async function POST(req) {
  try {
    const formData = await req.formData();
    const transcript = formData.get("transcript");

    if (!transcript) {
      return NextResponse.json({ error: "No transcript received" }, { status: 400 });
    }

    const prompt = `
You are an IELTS Speaking examiner.

Evaluate the following spoken response using IELTS Speaking Band Descriptors:

- Fluency and Coherence
- Lexical Resource
- Grammatical Range and Accuracy
- Pronunciation

If the speaker shows adequate performance in all areas and is at IELTS Band 6.0 or higher, respond with: **PASS**

If the speaker falls below IELTS Band 6.0 in grammar or vocabulary (or overall), respond with: **FAIL**

Response:
"${transcript}"

Your answer must be one word only: **PASS** or **FAIL**
`;

    const result = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const decision = result.choices[0].message.content.trim().toUpperCase();

    return NextResponse.json({
      result: decision === "PASS" ? "PASS" : "FAIL",
      transcript,
    });
  } catch (err) {
    console.error("Error evaluating speaking:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
