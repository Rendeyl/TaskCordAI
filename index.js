const discord = require("discord.js");
const express = require("express");
const app = express();
require("dotenv").config();

const connectDB = require("./db");
const { addTask, showTask, doneTask, editTask } = require("./commands");
const { getNextTaskId } = require("./utils");
const { runNotifier } = require("./notifier");

const PORT = Number(process.env.PORT) || 3000;

const client = new discord.Client({
  intents: [
    discord.GatewayIntentBits.Guilds,
    discord.GatewayIntentBits.GuildMessages,
    discord.GatewayIntentBits.MessageContent,
  ],
});

const MIN = 2 * 60 * 60 * 1000; // 2 hours
const MAX = 5 * 60 * 60 * 1000; // 5 hours

function scheduleNotifier() {
  const delay = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;

  setTimeout(async () => {
    try {
      await runNotifier(db, client);
    } catch (err) {
      console.error("Notifier error:", err);
    }

    scheduleNotifier();
  }, delay);
}

app.get("/", (req, res) => {
  res.send("TaskCordAI is running");
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

let db;

client.once("ready", async () => {
  db = await connectDB();

  scheduleNotifier();

  console.log(`Logged in as user ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "ping") {
    message.reply("AAAAAAAAA");
  }

  //!task
  if (message.content.startsWith("!task")) {
    const input = message.content.replace("!task", "").trim();

    if (!input) {
      return message.reply("Please Enter a Task");
    }

    try {
      await addTask(message, input, getNextTaskId, db);
    } catch (err) {
      console.log(err);
      message.reply(`Something Went Wrong Adding a Task...`);
    }
  }

  //!showtask
  if (message.content === "!showtask") {
    try {
      await showTask(message, db);
    } catch (err) {
      console.log(err);
      return message.reply("Something Went Wrong Showing all Tasks...");
    }
  }

  //!done
  if (message.content.startsWith("!done")) {
    const taskId = message.content.split(" ")[1];

    if (!taskId) return message.reply("Provide a task ID.");

    return doneTask(message, taskId, db);
  }

  //!edit
  if (message.content.startsWith("!edit")) {
    const [, taskId, ...rest] = message.content.split(" ");
    const input = rest.join(" ");

    if (!taskId || !input) {
      return message.reply("Usage: !edit <taskId> <changes>");
    }

    return editTask(message, taskId, input, db);
  }
});
client.login(process.env.BOT_TOKEN);
