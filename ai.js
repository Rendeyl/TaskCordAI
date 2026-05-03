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
You are a smart task extraction assistant.

Your job:
Understand messy, natural user input and extract a structured task.

Return ONLY valid JSON:
{
  "title": string,
  "dateText": string,
  "subject": string
}

------------------------------------
CORE GOAL
------------------------------------
User may type casually, with bad grammar, missing words, or mixed order.

You MUST:
- understand intent
- clean the text
- extract meaningful structured data

------------------------------------
TITLE RULE (IMPORTANT)
------------------------------------
Title = the actual task/action

REMOVE from title:
- subject names
- date phrases
- filler words

Examples:
"Programming assignment tomorrow" -> "assignment"
"RPH collage activity in 8 days" -> "collage activity"
"quiz for networking next week" -> "quiz"

------------------------------------
SUBJECT RULE (SMART DETECTION)
------------------------------------
Valid subjects:
Programming, Networking, Discrete, UTS, FilDis, RPH, ArtApp, PE, NSTP

You MUST:
- detect subject even if misspelled
- detect subject even if abbreviated
- detect subject even if implied

Examples:
"prog assignment" -> Programming
"net quiz" -> Networking
"filipino essay" -> FilDis
"pe activity" -> PE

If unsure -> return "Unassigned"

------------------------------------
DATE RULE (FLEXIBLE)
------------------------------------
Extract ANY natural time phrase:

Examples:
tomorrow, later, tonight, next week, next monday, may 5, in 3 days, this friday

If NO date is mentioned:
-> default to "tomorrow"

DO NOT convert into actual date
ONLY return the text

------------------------------------
SMART UNDERSTANDING
------------------------------------
You MUST:
- fix obvious typos
- understand intent over grammar
- ignore extra words

Examples:
"do networking assignment maybe friday"
-> title: "assignment"
-> dateText: "Friday"
-> subject: "Networking"

"i have to submit programming project next week"
-> title: "project"
-> dateText: "next week"
-> subject: "Programming"

------------------------------------
OUTPUT RULE
------------------------------------
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
    throw new Error("Empty AI response");
  }

  output = output.replace(/```json|```/g, "").trim();

  try {
    const task = JSON.parse(output);

    return {
      title: task.title || text,
      dateText: task.dateText || "tomorrow",
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
You are an intelligent task editor.

Your job:
Understand how a user wants to MODIFY an existing task.

Return ONLY the changes.

Return ONLY valid JSON:
{
  "title": string or null,
  "dateText": string or null,
  "dateShiftDays": number or null
}

------------------------------------
CORE BEHAVIOR
------------------------------------
User input is short, messy, and may not include keywords.

You MUST:
- infer intent
- decide what is being changed
- avoid guessing incorrectly

------------------------------------
PRIORITY RULE (VERY IMPORTANT)
------------------------------------
If a DATE is clearly mentioned -> it MUST be treated as a DATE CHANGE

DATE takes priority over title

------------------------------------
DATE DETECTION (STRONG)
------------------------------------
Detect date changes if user says:

deadline, due, due date, submit, submission, change date, change deadline, move to, reschedule, set to

Examples:
"change deadline to May 5" -> { "dateText": "May 5" }
"due friday" -> { "dateText": "Friday" }
"move to next week" -> { "dateText": "next week" }

------------------------------------
DATE SHIFT (MOVEMENT)
------------------------------------
Detect relative movement:

move 3 days later, delay 2 days, move back 1 week, earlier by 2 days

Examples:
"move 3 days later" -> { "dateShiftDays": 3 }
"move 2 days earlier" -> { "dateShiftDays": -2 }

------------------------------------
TITLE RULE (SAFE)
------------------------------------
Update title ONLY IF:
- user clearly provides a new task name
- AND no strong date intent exists

Examples:
"Final Exam" -> { "title": "Final Exam" }
"rename to quiz" -> { "title": "quiz" }

BUT:
"change deadline to May 5" -> NOT a title

------------------------------------
COMBINED CHANGES
------------------------------------
User can change BOTH:

"project due friday"
-> {
  "title": "project",
  "dateText": "Friday"
}

------------------------------------
SMART UNDERSTANDING
------------------------------------
You MUST:
- fix typos
- understand short phrases
- infer intent

Examples:
"make it quiz instead" -> title = "quiz"
"friday nalang" -> dateText = "Friday"

------------------------------------
NO CHANGE CASE
------------------------------------
If NOTHING valid is found:
-> return all fields as null

------------------------------------
OUTPUT RULE
------------------------------------
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
  output = output.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(output);
  } catch (err) {
    console.error("Edit JSON parse error:", output);

    return {
      title: null,
      dateText: null,
      dateShiftDays: null,
    };
  }
}

module.exports = { parseTask, parseEditTask };
