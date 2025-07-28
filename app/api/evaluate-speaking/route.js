import { NextResponse } from "next/server";
import formidable from "formidable";
import fs from "fs";
import { Readable } from "stream";
import { getOpenAIInstance } from "@/app/lib/getOpenAI";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function parseFormData(req) {
  const form = formidable({ multiples: false, keepExtensions: true });

  const chunks = [];
  const reader = req.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const rawBody = Buffer.concat(chunks);
  const stream = Readable.from(rawBody);

  const headers = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  if (!headers["content-length"]) {
    headers["content-length"] = rawBody.length.toString();
  }

  const fakeReq = Object.assign(stream, {
    headers,
    method: "POST",
    url: "",
  });

  return new Promise((resolve, reject) => {
    form.parse(fakeReq, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export async function POST(req) {
  const contentType = req.headers.get("content-type");

  try {
    const openai = await getOpenAIInstance(); // ✅ from Firestore only

    // Case 1: JSON transcript
    if (contentType.includes("application/json")) {
      const { transcript, topic, evaluationPrompt } = await req.json();

      const prompt = evaluationPrompt || `
You are an IELTS Speaking examiner. Evaluate this speaking response step by step:

STEP 1 - RELEVANCE CHECK (CRITICAL):
If the response is off-topic or irrelevant, return "FAIL" immediately.

STEP 2 - SPEAKING QUALITY:
Evaluate based on:
- Fluency and coherence
- Lexical resource
- Grammar and accuracy
- Pronunciation

SPEAKING TOPIC: ${topic}
RESPONSE: ${transcript}

Return ONLY "PASS" or "FAIL"
      `.trim();

      const result = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      });

      const decision = result.choices[0].message.content.trim().toUpperCase();

      return NextResponse.json({
        result: decision === "PASS" ? "PASS" : "FAIL",
        transcript,
      });
    }

    // Case 2: Audio form-data
    const { files } = await parseFormData(req);
    const file = files.audio?.[0];

    if (!file) {
      return NextResponse.json({ error: "No audio file received" }, { status: 400 });
    }

    const audioPath = file.filepath;

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
    });

    const text = transcription.text;

    const prompt = `
You are an IELTS Speaking examiner.

Evaluate the following spoken response using IELTS Speaking Band Descriptors:

- Fluency and Coherence
- Lexical Resource
- Grammar and Accuracy
- Pronunciation

If the speaker shows IELTS Band 6.0 or higher performance, return:
PASS
Else return:
FAIL

Response:
"${text}"

Respond with one word only: PASS or FAIL
    `.trim();

    const result = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const decision = result.choices[0].message.content.trim().toUpperCase();

    return NextResponse.json({
      result: decision === "PASS" ? "PASS" : "FAIL",
      transcript: text,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
