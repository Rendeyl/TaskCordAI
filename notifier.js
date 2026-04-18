const { formatDate } = require("./utils");

function getDaysLeft(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function getPriority(daysLeft) {
  if (daysLeft <= 0) return "overdue";
  if (daysLeft <= 4) return "high";
  if (daysLeft <= 7) return "medium";
  return "low";
}

function getCooldown(priority) {
  if (priority === "overdue") return 1000 * 60 * 30;
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
  if (priority === "overdue") return true;
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

    //console.log("Debugger-NOTIFYING:", task.title, priority);

    notifyList.push({ task, daysLeft, priority });

    await db
      .collection("tasks")
      .updateOne({ _id: task._id }, { $set: { lastNotifiedAt: new Date() } });
  }

  if (!notifyList.length) return;

  const channel = await client.channels.fetch(process.env.NOTIFY_CHANNEL_ID);

  const groups = {
    OVERDUE: [],
    HIGH: [],
    MEDIUM: [],
    LOW: [],
  };

  for (const item of notifyList) {
    const { task, daysLeft } = item;

    if (daysLeft <= 0) {
      groups.OVERDUE.push({ task, daysLeft });
    } else if (daysLeft <= 4) {
      groups.HIGH.push({ task, daysLeft });
    } else if (daysLeft <= 7) {
      groups.MEDIUM.push({ task, daysLeft });
    } else {
      groups.LOW.push({ task, daysLeft });
    }
  }

  let msg = `📌 Task Reminder\n\n`;

  function appendGroup(title, items) {
    if (!items.length) return;

    msg += `**${title}**\n`;

    for (const { task, daysLeft } of items) {
      const daysText =
        daysLeft < 0
          ? `${Math.abs(daysLeft)} days overdue`
          : `${daysLeft} days left`;

      msg += `- ${task.subject}: ${task.title} (${formatDate(
        task.dueDate,
      )}) — ${daysText}\n`;
    }

    msg += `\n`;
  }

  appendGroup("🔴 OVERDUE", groups.OVERDUE);
  appendGroup("🔴 HIGH", groups.HIGH);
  appendGroup("🟠 MEDIUM", groups.MEDIUM);
  appendGroup("🟡 LOW", groups.LOW);

  msg += `━━━━━━━━━━━━━━━━━━━━━━`;

  await channel.send(msg);
}

module.exports = { runNotifier };
