const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function parseTask(text) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
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

If missing info, infer logically.`,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = { parseTask };
