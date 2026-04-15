const { parseTask } = require("./ai");

// Add Task
async function addTask(message, input, getNextTaskId, db) {
  const task = await parseTask(input);

  if (!task.title || !task.dueDate) {
    return message.reply("Couldn't understand the task");
  }

  const taskId = await getNextTaskId(db, task.subject);
  await db.collection("tasks").insertOne({
    userId: message.author.id,
    taskId,
    title: task.title,
    subject: task.subject || "Unassigned",
    dueDate: task.dueDate,
    createdAt: new Date(),
  });

  return message.reply(
    `🧠 **Task Saved!**
    📌 Title: ${task.title}
    📅 Due: ${task.dueDate}
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

  for (const t of tasks) {
    const due = new Date(t.dueDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    const daysLeft =
      diffDays > 0
        ? `${diffDays} Days Left`
        : diffDays === 0
          ? "Due Today"
          : "Overdue";

    output += `📚 **${t.subject}**\n`;
    output += `${t.taskId} | ${t.title} | ${t.dueDate} | ${daysLeft}\n\n`;
  }

  return message.reply(output);
}

module.exports = { addTask, showTask };
