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

async function parseEditTask(text) {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `
You edit task updates.

Return ONLY valid JSON:

{
  "title": "string or null",
  "dateShiftDays": number or null
}

Rules:
- If user says "change title", update title
- If user says "move due date X days forward/back", convert to number
  (forward = positive, back = negative)
- If no change for a field, return null
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
  output = output.replace(/```json|```/g, "").trim();

  return JSON.parse(output);
}

module.exports = { parseTask, parseEditTask };
