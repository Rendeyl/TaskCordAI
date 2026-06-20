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
  console.log("🔔 Notifier started");

  const tasks = await db.collection("tasks").find({}).toArray();

  console.log(`📦 Total tasks: ${tasks.length}`);

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

  console.log(`📨 To notify: ${notifyList.length}`);

  const grouped = new Map();

  for (const item of notifyList) {
    const userId = item.task.userId;

    if (!grouped.has(userId)) grouped.set(userId, []);
    grouped.get(userId).push(item);
  }

  for (const [userId, items] of grouped) {
    console.log(`👤 Processing user: ${userId}`);

    let user;

    try {
      user = await client.users.fetch(userId, { force: true });
      console.log(`✅ User fetched: ${user.tag}`);
    } catch (err) {
      console.log(`❌ Failed to fetch user ${userId}:`, err.message);
      continue;
    }

    let msg = `📌 Task Reminder\n\n`;

    for (const { task, daysLeft } of items) {
      msg += `- ${task.title} (${formatDate(task.dueDate)})\n`;
    }

    try {
      await user.send(msg);
      console.log(`📤 DM sent to ${user.tag}`);
    } catch (err) {
      console.log(`❌ DM failed for ${user.tag}:`, err.message);
    }
  }

  console.log("🔔 Notifier finished");
}

module.exports = { runNotifier };
