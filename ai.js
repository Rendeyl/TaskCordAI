const Groq = require("groq-sdk");
const MODEL = "openai/gpt-oss-20b";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Create Task
async function parseTask(text) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `
Convert user input into JSON:

{
  "title": string,
  "dateText": string
}

Rules:
- title = clean task name
- dateText = natural language date
- default: tomorrow
ONLY JSON
        `,
      },
      { role: "user", content: text },
    ],
    temperature: 0.2,
  });

  let output = response.choices?.[0]?.message?.content;
  if (!output) throw new Error("Empty AI response");

  output = output.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(output);
  } catch {
    return { title: text, dateText: "tomorrow" };
  }
}

// Edit Task
async function parseEditTask(text) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `
Return JSON:
{
  "title": string|null,
  "dateText": string|null,
  "dateShiftDays": number|null
}

Rules:
- detect rename, reschedule, shift
- else nulls only
ONLY JSON
        `,
      },
      { role: "user", content: text },
    ],
    temperature: 0.2,
  });

  let output = response.choices?.[0]?.message?.content;
  if (!output) return { title: null, dateText: null, dateShiftDays: null };

  output = output.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(output);
  } catch {
    return { title: null, dateText: null, dateShiftDays: null };
  }
}

// Intent-Handler
async function parseTaskAction(text) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `
You are a task command classifier.

Return ONLY JSON:

{
  "action": "create | done | edit | unknown",
  "taskQuery": string,
  "title": string|null,
  "dateText": string|null,
  "dateShiftDays": number|null
}

RULES:

1. done:
- "I finished X"
- "mark X as done"
- "completed X"

2. edit:
- "move X to friday"
- "change X to ..."
- "update X"

3. create:
- new tasks only

4. taskQuery:
- extract the task being referred to

5. unknown:
- if unclear

ONLY JSON
        `,
      },
      { role: "user", content: text },
    ],
    temperature: 0.2,
  });

  let output = response.choices?.[0]?.message?.content;

  if (!output) {
    return {
      action: "unknown",
      taskQuery: text,
      title: null,
      dateText: null,
      dateShiftDays: null,
    };
  }

  output = output.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(output);
  } catch {
    return {
      action: "unknown",
      taskQuery: text,
      title: null,
      dateText: null,
      dateShiftDays: null,
    };
  }
}

module.exports = {
  parseTask,
  parseEditTask,
  parseTaskAction,
};
