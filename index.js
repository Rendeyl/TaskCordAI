const discord = require("discord.js");
require("dotenv").config();
const { parseTask } = require("./ai");

const client = new discord.Client({
  intents: [
    discord.GatewayIntentBits.Guilds,
    discord.GatewayIntentBits.GuildMessages,
    discord.GatewayIntentBits.MessageContent,
  ],
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
      message.reply(`Error: ${err}`);
    }
  }
});

client.login(process.env.BOT_TOKEN);
