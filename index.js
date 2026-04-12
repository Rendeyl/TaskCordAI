const discord = require("discord.js");
require("dotenv").config();

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

client.login(process.env.BOT_TOKEN);
