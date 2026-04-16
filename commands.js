const { parseTask } = require("./ai");
const { resolveDate, formatDate } = require("./utils");

// Add Task
async function addTask(message, input, getNextTaskId, db) {
  const task = await parseTask(input);

  const realDate = resolveDate(task.dateText);
  const dueDate = formatDate(realDate);

  if (!task.title) {
    return message.reply("Couldn't understand the task");
  }

  const taskId = await getNextTaskId(db, task.subject);
  await db.collection("tasks").insertOne({
    userId: message.author.id,
    taskId,
    title: task.title,
    subject: task.subject || "Unassigned",
    dueDate: dueDate,
    createdAt: new Date(),
  });

  return message.reply(
    `🧠 **Task Saved!**
    📌 Title: ${task.title}
    📅 Due: ${dueDate} (${task.dateText})
    🆔 Task ID: ${taskId}`,
  );
}

// Show Task
async function showTask(message, db) {
  const tasks = await db
    .collection("tasks")
    .find({ userId: message.author.id })
    .sort({ dueDate: 1 })
    .toArray();

  if (!tasks.length) {
    return message.reply("📭 You have no tasks.");
  }

  let output = "📋 **Your Tasks:**\n\n";

  const grouped = {};

  for (const t of tasks) {
    if (!grouped[t.subject]) {
      grouped[t.subject] = [];
    }
    grouped[t.subject].push(t);
  }

  const sortedSubjects = Object.keys(grouped).sort();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const subject of sortedSubjects) {
    output += `📚 **${subject}**\n`;

    for (const t of grouped[subject] || []) {
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);

      const msPerDay = 1000 * 60 * 60 * 24;
      const diffDays = Math.round((due - today) / msPerDay);

      const daysLeft =
        diffDays > 0
          ? `${diffDays} Days Left`
          : diffDays === 0
            ? "Due Today"
            : "Overdue";

      output += `${t.taskId} | ${t.title} | ${t.dueDate} | ${daysLeft}\n`;
    }

    output += `\n`;
  }

  return message.reply(output);
}

module.exports = { addTask, showTask };
