const { parseTask, parseEditTask } = require("./ai");
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
    lastNotifiedAt: null,
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

// Done/Remove Task
async function doneTask(message, taskId, db) {
  const id = taskId.toUpperCase();

  const task = await db.collection("tasks").findOne({
    userId: message.author.id,
    taskId: id,
  });

  if (!task) {
    return message.reply("Task not found.");
  }

  await db.collection("tasks").deleteOne({
    userId: message.author.id,
    taskId: id,
  });

  return message.reply(
    `✅ Task ${task.title} | ${task.taskId} Marked as Done and Removed.`,
  );
}

// Edit Task
async function editTask(message, taskId, input, db) {
  const id = taskId?.trim().toUpperCase();

  if (!id || !input) {
    return message.reply("Usage: !edit <taskId> <changes>");
  }

  const filter = {
    userId: message.author.id,
    taskId: id,
  };

  const task = await db.collection("tasks").findOne(filter);

  if (!task) {
    return message.reply("❌ Task not found.");
  }

  let update;

  try {
    update = await parseEditTask(input);
  } catch (err) {
    console.log("AI parse error:", err);
    return message.reply("❌ Could not understand edit request.");
  }

  const setData = {};

  if (typeof update?.title === "string") {
    setData.title = update.title;
  }

  if (typeof update?.dateShiftDays === "number") {
    const currentDate = new Date(task.dueDate || Date.now());

    currentDate.setDate(currentDate.getDate() + update.dateShiftDays);

    setData.dueDate = formatDate(currentDate);
  }

  if (Object.keys(setData).length === 0) {
    return message.reply("⚠️ No valid changes detected.");
  }

  await db.collection("tasks").updateOne(filter, {
    $set: setData,
  });

  const updatedTask = await db.collection("tasks").findOne(filter);

  if (!updatedTask) {
    return message.reply("❌ Task updated but could not be reloaded.");
  }

  return message.reply(
    `✏️ Updated Task\n📌 ${updatedTask.taskId} | ${updatedTask.title} | ${updatedTask.dueDate}`,
  );
}

module.exports = { addTask, showTask, doneTask, editTask };
