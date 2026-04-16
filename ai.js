const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function parseTask(text) {
  const today = new Date().toISOString().split("T")[0];
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `
You convert user messages into structured JSON tasks.

Return ONLY valid JSON:

{
  "title": "",
  "dateText": "",
  "subject": "Programming | Networking | Discrete | UTS | FilDis | RPH | ArtApp | PE | NSTP"
}

Rules:
- DO NOT convert the date into a real date
- Keep the original date phrase EXACTLY (e.g. "next week Tuesday", "tomorrow", "April 20")
- If no date is mentioned, use "tomorrow"
- If subject is not mentioned, guess based on context
- Default subject = "Unassigned"
- No explanation, ONLY JSON
`,
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.2,
  });

  let output = response.choices?.[0]?.message?.content;

  if (!output) {
    throw new Error("Empty AI response");
  }

  output = output.replace(/```json|```/g, "").trim();

  try {
    const task = JSON.parse(output);

    return {
      title: task.title || text,
      dateText: task.dateText || "Tommorow",
      subject: task.subject || "Unassigned",
    };
  } catch (err) {
    console.error("JSON parse error:", output);

    return {
      title: text,
      dueDate: new Date().toISOString().split("T")[0],
      subject: "Unassigned",
    };
  }
}

module.exports = { parseTask };
