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
You are a task extraction assistant.

Your job:
Convert messy user input into a clean structured task.

------------------------------------
OUTPUT FORMAT (STRICT JSON ONLY)
------------------------------------
{
  "title": string,
  "dateText": string
}

------------------------------------
RULES
------------------------------------

1. TITLE RULE
- Extract the actual action/task
- REMOVE:
  - dates
  - filler words
  - unnecessary context

Examples:
"programming final next Tuesday" -> "Programming Final"
"submit networking quiz tomorrow" -> "Submit Networking Quiz"

------------------------------------
2. DATE RULE
- Extract natural language date
Examples:
tomorrow, next week, friday, in 3 days, may 5

If no date is found:
→ default "tomorrow"

DO NOT convert to real date.

Only return text.

------------------------------------
3. BE SMART
- fix grammar
- understand intent
- ignore noise

Examples:
"i have to submit capstone friday" -> "Capstone Submission", "Friday"
"network quiz next week pls" -> "Network Quiz", "next week"

------------------------------------
4. OUTPUT RULE
- ONLY JSON
- NO markdown
- NO explanation
- NO extra text
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
    const parsed = JSON.parse(output);

    return {
      title: parsed.title || text,
      dateText: parsed.dateText || "tomorrow",
    };
  } catch (err) {
    console.error("AI parse error:", output);

    return {
      title: text,
      dateText: "tomorrow",
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
You are a task editing assistant.

Your job:
Detect how a user wants to modify a task.

------------------------------------
OUTPUT FORMAT (STRICT JSON ONLY)
------------------------------------
{
  "title": string | null,
  "dateText": string | null,
  "dateShiftDays": number | null
}

------------------------------------
RULES
------------------------------------

1. DATE CHANGES
If user mentions:
- due
- deadline
- move to
- reschedule

→ treat as dateText

Examples:
"move to friday" -> { "dateText": "Friday" }
"due next week" -> { "dateText": "next week" }

------------------------------------
2. SHIFTING DATES
Examples:
"move 2 days later" -> { "dateShiftDays": 2 }
"move back 1 day" -> { "dateShiftDays": -1 }

------------------------------------
3. TITLE CHANGE
Only if user clearly renames task

Examples:
"rename to quiz" -> { "title": "Quiz" }

------------------------------------
4. NO GUESSING
If unsure:
return all nulls

------------------------------------
5. OUTPUT RULE
- ONLY JSON
- NO explanation
- NO markdown
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
    return {
      title: null,
      dateText: null,
      dateShiftDays: null,
    };
  }

  output = output.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(output);
  } catch (err) {
    console.error("Edit AI parse error:", output);

    return {
      title: null,
      dateText: null,
      dateShiftDays: null,
    };
  }
}

module.exports = {
  parseTask,
  parseEditTask,
};
