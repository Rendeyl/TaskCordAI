const discord = require("discord.js");
const express = require("express");
const app = express();
require("dotenv").config();

const connectDB = require("./db");
const { addTask, showTask } = require("./commands");
const { getNextTaskId } = require("./utils");

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

let db;

client.once("ready", async () => {
  db = await connectDB();
  console.log(`Logged in as user ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "ping") {
    message.reply("RUNNING");
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
});
client.login(process.env.BOT_TOKEN);
