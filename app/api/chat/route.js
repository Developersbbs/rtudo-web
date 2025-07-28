import { getOpenAIInstance } from "@/app/lib/getOpenAI";

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Messages array required" }, { status: 400 });
    }

    const filteredMessages = messages
      .filter(
        (msg) =>
          msg &&
          typeof msg.role === "string" &&
          typeof msg.text === "string" &&
          msg.text.trim().length > 0
      )
      .map((msg) => ({
        role: msg.role,
        content: msg.text.trim(),
      }));

    if (filteredMessages.length === 0) {
      return Response.json({ error: "No valid messages found" }, { status: 400 });
    }

    const openai = await getOpenAIInstance();

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly and expert IELTS trainer helping students improve speaking, writing, reading, and listening skills. Respond like a real IELTS coach with clear, actionable feedback.",
        },
        ...filteredMessages,
      ],
    });

    const reply = response.choices[0].message.content;

    return Response.json({ reply });
  } catch (err) {
    console.error("[/api/chat] Error:", err.message);
    return Response.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
