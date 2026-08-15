const discord = require("discord.js");
const express = require("express");
require("dotenv").config();

const connectDB = require("./db");
const { runNotifier, sendManualDigest } = require("./notifier");

const { showTask, handleNaturalInput, isUserActivated } = require("./commands");

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

app.get("/", (req, res) => {
  res.send("TaskCordAI running");
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

let db;

client.once("ready", async () => {
  db = await connectDB();

  console.log(`Logged in as ${client.user.tag}`);

  await runNotifier(db, client);

  setInterval(
    async () => {
      try {
        await runNotifier(db, client);
      } catch (err) {
        console.error("Notifier error:", err);
      }
    },
    1000 * 60 * 15,
  );

  console.log("Notification scheduler started");
});

function getContext(message) {
  return {
    isDM: message.channel.isDMBased(),
    userId: message.author.id,
    guildId: message.guild?.id ?? null,
  };
}

// Message Handler
client.on("messageCreate", async (message) => {
  if (!message || message.author.bot) return;
  if (!message.content) return;

  const content = message.content.trim();
  const ctx = getContext(message);

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
      await user.send("Welcome to TaskCordAI!");

      return message.reply("Activated! Check your DMs.");
    }

    if (!ctx.isDM) {
      return message.reply("Only !start is allowed in server.");
    }

    const active = await isUserActivated(db, ctx.userId);

    if (content === "!latestcommit") {
      return message.reply("Commit Number: 38");
    }

    if (!active) {
      return message.reply("Please use !start in a server first.");
    }

    if (content === "!showtask") {
      return showTask(message, db, ctx);
    }

    if (content === "!digest") {
      await sendManualDigest(db, client, ctx.userId);
      return message.reply("Sent digest.");
    }

    // Natural Language Input (Intent-Based)
    return await handleNaturalInput(message, content, db, ctx);
  } catch (err) {
    console.error(err);
    return message.reply("Something went wrong.");
  }
});

client.login(process.env.BOT_TOKEN);
