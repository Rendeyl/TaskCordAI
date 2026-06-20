const { parseTask, parseEditTask } = require("./ai");
const { resolveDate, formatDate } = require("./utils");

async function isUserActivated(db, userId) {
  const user = await db.collection("users").findOne({ userId });
  return user?.activated === true;
}

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

async function showTask(message, db, ctx) {
  const tasks = await db
    .collection("tasks")
    .find({ userId: ctx.userId })
    .sort({ dueDate: 1 })
    .toArray();

  if (!tasks.length) return message.reply("📭 No tasks.");

  let out = "📋 Tasks\n\n";

  for (const t of tasks) {
    out += `\`${t.taskId}\` | ${t.title} | ${t.dueDate}\n`;
  }

  return message.reply(out);
}

async function doneTask(message, taskId, db, ctx) {
  if (!taskId) return message.reply("❌ Missing ID");

  const id = taskId.toUpperCase();

  const task = await db.collection("tasks").findOne({
    userId: ctx.userId,
    taskId: id,
  });

  if (!task) return message.reply("❌ Not found");

  await db.collection("tasks").deleteOne({
    userId: ctx.userId,
    taskId: id,
  });

  return message.reply(`✅ Done: ${task.title}`);
}

async function editTask(message, taskId, input, db, ctx) {
  const id = taskId.toUpperCase();

  const task = await db.collection("tasks").findOne({
    userId: ctx.userId,
    taskId: id,
  });

  if (!task) return message.reply("❌ Not found");

  const update = await parseEditTask(input);

  const set = {};

  if (update?.title) set.title = update.title;

  if (update?.dateText) {
    set.dueDate = formatDate(resolveDate(update.dateText));
  }

  if (update?.dateShiftDays) {
    const d = new Date(task.dueDate);
    d.setDate(d.getDate() + update.dateShiftDays);
    set.dueDate = formatDate(d);
  }

  if (!Object.keys(set).length) {
    return message.reply("⚠️ No changes");
  }

  await db
    .collection("tasks")
    .updateOne({ userId: ctx.userId, taskId: id }, { $set: set });

  return message.reply(`✏️ Updated ${id}`);
}

async function handleNaturalInput(message, input, db, ctx) {
  const task = await parseTask(input);

  if (!task?.title) return message.reply("❌ Couldn't understand");

  const due = formatDate(resolveDate(task.dateText));
  const taskId = await getNextTaskId(db, ctx.userId);

  await db.collection("tasks").insertOne({
    userId: ctx.userId,
    taskId,
    title: task.title,
    dueDate: due,
    createdAt: new Date(),
  });

  return message.reply(
    `🧠 Task Created\n📌 ${task.title}\n📅 ${due}\n🆔 ${taskId}`,
  );
}

module.exports = {
  showTask,
  doneTask,
  editTask,
  handleNaturalInput,
  isUserActivated,
};
