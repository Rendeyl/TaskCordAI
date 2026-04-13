const discord = require("discord.js");
require("dotenv").config();
const { parseTask } = require("./ai");

const express = require("express");
const app = express();

const connectDB = require("./db");

async function getNextTaskId(db, subject) {
  const prefixMap = {
    Programming: "PRO",
    Networking: "NET",
    Discrete: "DIS",
    UTS: "UTS",
    FilDis: "FIL",
    RPH: "RPH",
    ArtApp: "ART",
    PE: "PE",
    NSTP: "NSTP",
  };

  const prefix = prefixMap[subject] || "TSK";

  const counters = db.collection("counters");

  const updated = await counters.findOneAndUpdate(
    { subject },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  const number = updated?.value?.count ?? 1;

  return `${prefix}${String(number).padStart(3, "0")}`;
}

const PORT = Number(process.env.PORT) || 3000;

const client = new discord.Client({
  intents: [
    discord.GatewayIntentBits.Guilds,
    discord.GatewayIntentBits.GuildMessages,
    discord.GatewayIntentBits.MessageContent,
  ],
});

app.get("/", (req, res) => {
  res.send("TaskCordAI is running");
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

client.once("ready", () => {
  console.log(`Logged in as user ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "ping") {
    message.reply("RUNNING");
  }

  if (message.content.startsWith("!task")) {
    const input = message.content.replace("!task", "").trim();

    if (!input) {
      return message.reply("Please Enter a Task");
    }

    try {
      const task = await parseTask(input);

      if (!task.title || !task.dueDate) {
        return message.reply("Couldn't understand the task");
      }

      const db = await connectDB();

      const taskId = await getNextTaskId(db, task.subject);
      const result = await db.collection("tasks").insertOne({
        userId: message.author.id,
        taskId,
        title: task.title,
        subject: task.subject || "Unassigned",
        dueDate: task.dueDate,
        priority: task.priority || "medium",
        status: "pending",
        createdAt: new Date(),
      });

      return message.reply(
        `🧠 **Task Saved!**
        📌 Title: ${task.title}
        📅 Due: ${task.dueDate}
        ⚡ Priority: ${task.priority}
        🆔 Task ID: ${taskId}`,
      );
    } catch (err) {
      console.log(err);
      message.reply(`Something Went Wrong...`);
    }
  }

  if (message.content === "!showtask") {
    try {
      const db = await connectDB();

      const tasks = await db
        .collection("tasks")
        .find({ userId: message.author.id, status: "pending" })
        .toArray();

      if (!tasks.length) {
        return message.reply("📭 You have no tasks.");
      }

      let output = "📋 **Your Tasks:**\n\n";

      for (const t of tasks) {
        const due = new Date(t.dueDate);
        const today = new Date();

        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        const daysLeft =
          diffDays > 0
            ? `${diffDays} Days Left`
            : diffDays === 0
              ? "Due Today"
              : "Overdue";

        output += `📚 **${t.subject}**\n`;
        output += `${t.taskId} | ${t.title} | ${t.dueDate} | ${daysLeft}\n\n`;
      }

      return message.reply(output);
    } catch (err) {
      console.log(err);
      return message.reply("❌ Failed to fetch tasks.");
    }
  }
});
client.login(process.env.BOT_TOKEN);
