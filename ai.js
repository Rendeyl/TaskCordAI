const fs = require("fs");
const path = require("path");

const Groq = require("groq-sdk");
const MODEL = "openai/gpt-oss-20b";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const PROMPTS_DIR = path.join(__dirname, "prompts");

const taskCreatePrompt = fs.readFileSync(
  path.join(__dirname, "create.txt"),
  "utf8",
);

const taskActionPrompt = fs.readFileSync(
  path.join(__dirname, "action.txt"),
  "utf8",
);

const taskEditPrompt = fs.readFileSync(
  path.join(__dirname, "edit.txt"),
  "utf8",
);

// Create Task
async function parseTask(text) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: taskCreatePrompt,
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
        content: taskEditPrompt,
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
        content: taskActionPrompt,
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
