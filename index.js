const discord = require("discord.js");
const express = require("express");
require("dotenv").config();

const connectDB = require("./db");

const {
  showTask,
  doneTask,
  editTask,
  handleNaturalInput,
  isUserActivated,
} = require("./commands");

const PORT = process.env.PORT || 3000;

const client = new discord.Client({
  intents: [
    discord.GatewayIntentBits.Guilds,
    discord.GatewayIntentBits.GuildMessages,
    discord.GatewayIntentBits.DirectMessages,
    discord.GatewayIntentBits.MessageContent,
  ],
  partials: [
    discord.Partials.Channel,
    discord.Partials.Message,
    discord.Partials.User,
  ],
});

const app = express();
app.get("/", (req, res) => res.send("TaskCordAI running"));
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

let db;

client.once("ready", async () => {
  db = await connectDB();
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

function getContext(message) {
  return {
    isDM: message.channel.isDMBased(),
    userId: message.author.id,
    guildId: message.guild?.id ?? null,
  };
}

client.on("messageCreate", async (message) => {
  if (!message || message.author.bot) return;
  if (!message.content) return;

  const content = message.content.trim();
  const ctx = getContext(message);

  console.log("📩", {
    content,
    userId: ctx.userId,
    isDM: ctx.isDM,
    guild: ctx.guildId,
  });

  try {
    if (!ctx.isDM && content === "!start") {
      await db
        .collection("users")
        .updateOne(
          { userId: ctx.userId },
          { $set: { activated: true } },
          { upsert: true },
        );

      const user = await client.users.fetch(ctx.userId);

      await user.send(
        "👋 Welcome to TaskCordAI!\n\nYou can now use commands in DM.",
      );

      return message.reply("✅ Activated! Check your DMs.");
    }

    if (!ctx.isDM) {
      return message.reply("❌ Only !start is allowed in server.");
    }

    const active = await isUserActivated(db, ctx.userId);

    if (!active) {
      return message.reply("❌ Please use !start in a server first.");
    }

    if (content === "!showtask") {
      return await showTask(message, db, ctx);
    }

    if (content.startsWith("!done")) {
      const taskId = content.split(" ")[1];
      return await doneTask(message, taskId, db, ctx);
    }

    if (content.startsWith("!edit")) {
      const [, taskId, ...rest] = content.split(" ");
      return await editTask(message, taskId, rest.join(" "), db, ctx);
    }

    return await handleNaturalInput(message, content, db, ctx);
  } catch (err) {
    console.error("❌ ERROR:", err);
    return message.reply("Something went wrong.");
  }
});

client.login(process.env.BOT_TOKEN);
