const { formatDate } = require("./utils");

function getDaysLeft(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function getPriority(daysLeft) {
  if (daysLeft <= 4) return "high"; // 0–4
  if (daysLeft <= 7) return "medium"; // 5–7
  return "low"; // 8+
}

function getCooldown(priority) {
  if (priority === "high") return 1000 * 60 * 60;
  if (priority === "medium") return 1000 * 60 * 60 * 3;
  return 1000 * 60 * 60 * 8;
}

function isCooldownOver(task, cooldownMs) {
  if (!task.lastNotifiedAt) return true;

  const last = new Date(task.lastNotifiedAt).getTime();
  return Date.now() - last >= cooldownMs;
}

function randomChance(priority) {
  if (priority === "high") return true;
  if (priority === "medium") return Math.random() < 0.6;
  return Math.random() < 0.2;
}

async function runNotifier(db, client) {
  const tasks = await db.collection("tasks").find({}).toArray();
  if (!tasks.length) return;

  const notifyList = [];

  for (const task of tasks) {
    const daysLeft = getDaysLeft(task.dueDate);
    const priority = getPriority(daysLeft);
    const cooldown = getCooldown(priority);

    if (!isCooldownOver(task, cooldown)) continue;
    if (!randomChance(priority)) continue;

    notifyList.push({ task, daysLeft, priority });

    await db
      .collection("tasks")
      .updateOne({ _id: task._id }, { $set: { lastNotifiedAt: new Date() } });
  }

  if (!notifyList.length) return;

  const channel = await client.channels.fetch(process.env.NOTIFY_CHANNEL_ID);

  let msg = `📌 Task Reminder\n\n`;

  for (const item of notifyList) {
    const { task, daysLeft } = item;

    const label =
      daysLeft <= 0
        ? "🔴 OVERDUE"
        : daysLeft <= 1
          ? "🔴 DUE SOON"
          : daysLeft <= 4
            ? "🟠 MEDIUM"
            : "🟡 UPCOMING";

    msg += `- [${label}] ${task.subject}: ${task.title} (${task.dueDate}) — ${daysLeft} days left\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━━━`;

  await channel.send(msg);
}

module.exports = { runNotifier };
