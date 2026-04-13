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
  "dueDate": "YYYY-MM-DD",
  "subject": "Programming | Networking | Discrete | UTS | FilDis | RPH | ArtApp | PE | NSTP",
  "priority": "low | medium | high"
}

Rules:
- Today is ${today}
- Convert relative dates like "tomorrow", "next Friday"
- If user gives only a day number (e.g. "15"), assume current month and year
- If that date already passed, use next month
- dueDate must be YYYY-MM-DD
- If subject is not mentioned, guess based on context
- Default subject = "Unassigned"
- If user does NOT specify a date, assume tomorrow
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
      dueDate: task.dueDate || new Date().toISOString().split("T")[0],
      priority: task.priority || "medium",
      subject: task.subject || "Unassigned",
    };
  } catch (err) {
    console.error("JSON parse error:", output);

    return {
      title: text,
      dueDate: "unknown",
      priority: "medium",
    };
  }
}

module.exports = { parseTask };
