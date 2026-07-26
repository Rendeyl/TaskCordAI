const { parseTask, parseEditTask, parseTaskAction } = require("./ai");
const { resolveDate, formatDate } = require("./utils");

// Auth
async function isUserActivated(db, userId) {
  const user = await db.collection("users").findOne({ userId });
  return user?.activated === true;
}

// Task ID Generator
async function getNextTaskId(db, userId) {
  const counters = db.collection("counters");

  const res = await counters.findOneAndUpdate(
    { userId },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  const count = res.value?.count || 1;
  return `TSK${String(count).padStart(3, "0")}`;
}

// Task Matcher/Finder
function findBestTask(tasks, query) {
  if (!query) return null;

  query = query.toLowerCase();

  let best = null;
  let bestScore = 0;

  for (const task of tasks) {
    const title = task.title.toLowerCase();

    let score = 0;

    if (title === query) score = 100;
    else if (title.includes(query)) score = 80;
    else {
      const words = query.split(" ");
      for (const w of words) {
        if (title.includes(w)) score += 15;
      }
    }

    if (score > bestScore) {
      best = task;
      bestScore = score;
    }
  }

  return bestScore >= 20 ? best : null;
}

// Show Task COmmand
async function showTask(message, db, ctx) {
  const tasks = await db
    .collection("tasks")
    .find({ userId: ctx.userId, completed: { $ne: true } })
    .sort({ dueDate: 1 })
    .toArray();

  if (!tasks.length) return message.reply("📭 No tasks.");

  let out = "Active Tasks\n\n";

  for (const t of tasks) {
    out += `\`${t.taskId}\` | ${t.title} | ${t.dueDate}\n`;
  }

  return message.reply(out);
}

// New Done
async function doneTaskByDoc(message, task, db, ctx) {
  await db.collection("tasks").updateOne(
    { _id: task._id },
    {
      $set: {
        completed: true,
        completedAt: new Date(),
      },
    },
  );

  return message.reply(`✅ Completed: ${task.title}`);
}

// New Edit
async function editTaskByDoc(message, task, intent, db, ctx) {
  const set = {};

  if (intent.title) set.title = intent.title;

  if (intent.dateText) {
    set.dueDate = formatDate(resolveDate(intent.dateText));
  }

  if (intent.dateShiftDays) {
    const d = new Date(task.dueDate);
    d.setDate(d.getDate() + intent.dateShiftDays);
    set.dueDate = formatDate(d);
  }

  if (!Object.keys(set).length) {
    return message.reply("No changes detected.");
  }

  await db.collection("tasks").updateOne({ _id: task._id }, { $set: set });

  return message.reply(`Updated: ${task.title}`);
}

// New Handler
async function handleNaturalInput(message, input, db, ctx) {
  const intent = await parseTaskAction(input);

  // fallback: CREATE
  if (intent.action === "create" || intent.action === "unknown") {
    const task = await parseTask(input);

    const due = formatDate(resolveDate(task.dateText));
    const taskId = await getNextTaskId(db, ctx.userId);

    await db.collection("tasks").insertOne({
      userId: ctx.userId,
      taskId,
      title: task.title,
      dueDate: due,
      completed: false,
      urgentReminderSent: false,
      dueTodayReminderSent: false,
      createdAt: new Date(),
    });

    return message.reply(
      `Task Created\nName: ${task.title}\nDue: ${due}\nID: ${taskId}`,
    );
  }

  // fetch active tasks
  const tasks = await db
    .collection("tasks")
    .find({ userId: ctx.userId, completed: { $ne: true } })
    .toArray();

  const task = findBestTask(tasks, intent.taskQuery);

  if (!task) {
    return message.reply("Couldn't find matching task.");
  }

  // DONE
  if (intent.action === "done") {
    return doneTaskByDoc(message, task, db, ctx);
  }

  // EDIT
  if (intent.action === "edit") {
    return editTaskByDoc(message, task, intent, db, ctx);
  }

  return message.reply("I didn't understand that command.");
}

module.exports = {
  showTask,
  isUserActivated,
  handleNaturalInput,
};
