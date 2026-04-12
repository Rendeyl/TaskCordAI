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

    const task = await parseTask(input);

    message.reply(
      `🧠 Task created:\n**${task.title}**\n📅 ${task.dueDate}\n⚡ ${task.priority}`,
    );
  }
});

client.login(process.env.BOT_TOKEN);
