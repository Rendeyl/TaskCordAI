const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function parseTask(text) {
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
  "dueDate": "",
  "priority": "low | medium | high"
}

Rules:
- Today is 2026-04-13
- Convert relative dates like "tomorrow", "next Friday"
- dueDate must be YYYY-MM-DD
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

  let output = response.choices[0].message.content;

  // clean possible markdown
  output = output.replace(/```json|```/g, "").trim();

  try {
    const task = JSON.parse(output);

    return {
      title: task.title || text,
      dueDate: task.dueDate || "unknown",
      priority: task.priority || "medium",
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
