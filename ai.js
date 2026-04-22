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
You are a strict task parser.

Your job:
Extract structured task data from messy user text.

Return ONLY valid JSON:
{
  "title": string,
  "dateText": string,
  "subject": string
}

--------------------
RULES (VERY IMPORTANT)
--------------------

1. TITLE RULE:
- Remove subject names from the title
- Remove date phrases from the title
- Title should be ONLY the task action/content

Bad:
"RPH collage activity in 8 days"
Good:
"collage activity"

Bad:
"Programming assignment tomorrow"
Good:
"assignment"

--------------------

2. SUBJECT RULE:
Valid subjects:
Programming, Networking, Discrete, UTS, FilDis, RPH, ArtApp, PE, NSTP

- Match even if misspelled:
  "progamming" → Programming
  "rphh" → RPH
  "fildiss" → FilDis

- If unsure, return "Unassigned"

- NEVER include subject in title

--------------------

3. DATE RULE:
- Extract natural time expressions:
  "tomorrow", "in 8 days", "next week", "April 20"
- If no date exists → "tomorrow"
- DO NOT convert into real date

--------------------

4. CLEANING RULE:
- Fix obvious typos in meaning (collage → college ONLY if context suggests school)
- Ignore grammar mistakes
- Focus on intent, not spelling

--------------------

5. OUTPUT RULE:
- Return ONLY JSON
- No explanations
- No markdown
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
You are an intelligent TASK EDITOR.

Your job:
Given a user edit instruction, modify an existing task conceptually and output ONLY the changes.

You are NOT a form parser.
You are a task rewriter that extracts differences.

Return ONLY valid JSON:
{
  "title": string or null,
  "dateText": string or null,
  "dateShiftDays": number or null
}

------------------------------------
CORE BEHAVIOR (VERY IMPORTANT)
------------------------------------

You MUST imagine:
- the user is editing an existing task
- the instruction may be short, vague, or incomplete
- your job is to infer intent

------------------------------------
TITLE RULE (CRITICAL FIX)
------------------------------------

If user mentions ANY of these:
- "change title"
- "rename"
- OR gives a new phrase after task id (VERY IMPORTANT)
- OR simply says a new phrase (like "Final Exam")

→ THEN treat it as NEW TITLE

Examples:

"!edit net002 Final Exam"
→ { "title": "Final Exam" }

"!edit net002 change to Final Exam"
→ { "title": "Final Exam" }

"!edit net002 make it quiz instead"
→ { "title": "quiz" }

------------------------------------
DATE RULE
------------------------------------

A) If user gives a new date:
- "May 1", "Friday", "tomorrow"
→ set "dateText"

B) If user gives movement:
- "move 3 days later"
→ dateShiftDays: 3

C) If no date change → null

------------------------------------
FLEXIBILITY RULE (IMPORTANT)
------------------------------------

- Treat short messages AFTER taskId as intent
- Even if no keywords exist
- Fix typos automatically
- Assume intent, not grammar

Examples:

"!edit net002 Final Exam"
→ treat as title replacement

"!edit net002 project due Friday"
→ title: "project", dateText: "Friday"

------------------------------------
OUTPUT RULE
------------------------------------

- ONLY JSON
- NO explanations
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
  output = output.replace(/```json|```/g, "").trim();

  return JSON.parse(output);
}

module.exports = { parseTask, parseEditTask };
