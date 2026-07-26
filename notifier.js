const { formatDate } = require("./utils");

const DIGEST_HOUR = 8;
const DEFAULT_TIMEZONE = "Asia/Manila";

function getDatePartsInTimezone(timezone = DEFAULT_TIMEZONE) {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now);

  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;

  return {
    today: `${year}-${month}-${day}`,
  };
}

function getHourInTimezone(timezone = DEFAULT_TIMEZONE) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).format(new Date());

  return Number(hour);
}

function isDigestWindow(timezone) {
  const hour = getHourInTimezone(timezone);
  return hour >= 8 && hour < 9;
}

function getDaysLeft(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

async function sendDailyDigest(db, client, userDoc) {
  const timezone = userDoc.timezone || DEFAULT_TIMEZONE;

  if (!isDigestWindow(timezone)) {
    return;
  }

  const { today } = getDatePartsInTimezone(timezone);

  if (userDoc.lastDigestDate === today) {
    return;
  }

  const tasks = await db
    .collection("tasks")
    .find({
      userId: userDoc.userId,
      completed: { $ne: true },
    })
    .sort({ dueDate: 1 })
    .toArray();

  if (!tasks.length) {
    await db.collection("users").updateOne(
      { userId: userDoc.userId },
      {
        $set: {
          lastDigestDate: today,
        },
      },
    );

    return;
  }

  let overdue = [];
  let dueSoon = [];
  let upcoming = [];

  for (const task of tasks) {
    const daysLeft = getDaysLeft(task.dueDate);

    if (daysLeft < 0) {
      overdue.push(task);
    } else if (daysLeft <= 3) {
      dueSoon.push(task);
    } else {
      upcoming.push(task);
    }
  }

  let msg = "Good Morning!\n\n";

  msg += `You have ${tasks.length} active task(s).\n\n`;

  if (overdue.length) {
    msg += "OVERDUE\n";

    for (const task of overdue) {
      msg += `• ${task.title}\n`;
      msg += `  Due: ${task.dueDate}\n`;
    }

    msg += "\n";
  }

  if (dueSoon.length) {
    msg += "DUE SOON\n";

    for (const task of dueSoon) {
      msg += `• ${task.title}\n`;
      msg += `  Due: ${task.dueDate}\n`;
    }

    msg += "\n";
  }

  if (upcoming.length) {
    msg += "UPCOMING\n";

    for (const task of upcoming) {
      msg += `• ${task.title}\n`;
      msg += `  Due: ${task.dueDate}\n`;
    }

    msg += "\n";
  }

  msg += "Have a productive day!";

  const user = await client.users.fetch(userDoc.userId);

  await user.send(msg);

  await db.collection("users").updateOne(
    { userId: userDoc.userId },
    {
      $set: {
        lastDigestDate: today,
      },
    },
  );

  console.log(`Digest sent to ${user.tag}`);
}

async function sendUrgentReminders(db, client, userDoc) {
  const tasks = await db
    .collection("tasks")
    .find({
      userId: userDoc.userId,
      completed: { $ne: true },
    })
    .toArray();

  if (!tasks.length) {
    return;
  }

  const user = await client.users.fetch(userDoc.userId);

  for (const task of tasks) {
    const daysLeft = getDaysLeft(task.dueDate);

    // Due tomorrow
    if (daysLeft === 1 && task.urgentReminderSent !== true) {
      try {
        await user.send(`Due Tomorrow\n\n${task.title}\n📅 ${task.dueDate}`);

        await db.collection("tasks").updateOne(
          { _id: task._id },
          {
            $set: {
              urgentReminderSent: true,
            },
          },
        );

        console.log(`Due-tomorrow reminder: ${task.title}`);
      } catch (err) {
        console.error(err);
      }
    }

    // Due today
    if (daysLeft === 0 && task.dueTodayReminderSent !== true) {
      try {
        await user.send(
          `Due Today\n\n${task.title}\n📅 ${task.dueDate}\n\nDon't forget to submit it today.`,
        );

        await db.collection("tasks").updateOne(
          { _id: task._id },
          {
            $set: {
              dueTodayReminderSent: true,
            },
          },
        );

        console.log(`Due-today reminder: ${task.title}`);
      } catch (err) {
        console.error(err);
      }
    }
  }
}

async function runNotifier(db, client) {
  console.log("🔔 Running notifier...");

  const users = await db
    .collection("users")
    .find({ activated: true })
    .toArray();

  console.log(`👥 Active users: ${users.length}`);

  for (const userDoc of users) {
    try {
      await sendDailyDigest(db, client, userDoc);
      await sendUrgentReminders(db, client, userDoc);
    } catch (err) {
      console.error(`❌ Notification failed for ${userDoc.userId}`, err);
    }
  }

  console.log("✅ Notifier finished");
}

async function sendManualDigest(db, client, userId) {
  const userDoc = await db.collection("users").findOne({ userId });

  if (!userDoc) return;

  const tasks = await db
    .collection("tasks")
    .find({
      userId,
      completed: { $ne: true },
    })
    .sort({ dueDate: 1 })
    .toArray();

  const user = await client.users.fetch(userId);

  if (!tasks.length) {
    return user.send("You have no active tasks.");
  }

  let overdue = [];
  let dueSoon = [];
  let upcoming = [];

  const now = new Date();

  for (const task of tasks) {
    const due = new Date(task.dueDate);
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diff < 0) overdue.push(task);
    else if (diff <= 3) dueSoon.push(task);
    else upcoming.push(task);
  }

  let msg = "MANUAL DAILY DIGEST\n\n";

  if (overdue.length) {
    msg += "🔴 OVERDUE\n";
    for (const t of overdue) {
      msg += `• ${t.title} (${t.dueDate})\n`;
    }
    msg += "\n";
  }

  if (dueSoon.length) {
    msg += "🟡 DUE SOON\n";
    for (const t of dueSoon) {
      msg += `• ${t.title} (${t.dueDate})\n`;
    }
    msg += "\n";
  }

  if (upcoming.length) {
    msg += "🟢 UPCOMING\n";
    for (const t of upcoming) {
      msg += `• ${t.title} (${t.dueDate})\n`;
    }
  }

  await user.send(msg);
}

module.exports = {
  runNotifier,
  sendManualDigest,
};
