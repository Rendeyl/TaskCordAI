const discord = require("discord.js");
require("dotenv").config();
const { parseTask } = require("./ai");

const express = require("express");
const app = express();

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
    message.reply("pong");
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

      return message.reply(
        `🧠 **Task Created**
📌 **Title:** ${task.title}
📅 **Due:** ${task.dueDate}
⚡ **Priority:** ${task.priority || "medium"}`,
      );
    } catch (err) {
      console.log(err);
      message.reply(`Something Went Wrong...`);
    }
  }
});
client.login(process.env.BOT_TOKEN);
