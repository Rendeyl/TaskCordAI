const chrono = require("chrono-node");

async function getNextTaskId(db, subject) {
  const key = subject?.trim().toUpperCase();
  const prefixMap = {
    PROGRAMMING: "PRO",
    NETWORKING: "NET",
    DISCRETE: "DIS",
    UTS: "UTS",
    FILDIS: "FIL",
    RPH: "RPH",
    ARTAPP: "ART",
    PE: "PE",
    NSTP: "NSTP",
  };

  const prefix = prefixMap[key] || "TSK";
  const counters = db.collection("counters");

  const updated = await counters.findOneAndUpdate(
    { subject: key },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  const number = updated?.value?.count;

  if (!number) {
    const doc = await counters.findOne({ subject: key });
    return `${prefix}${String(doc?.count || 1).padStart(3, "0")}`;
  }

  return `${prefix}${String(number).padStart(3, "0")}`;
}

function resolveDate(dateText) {
  const text = dateText.toLowerCase();

  const today = new Date();
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  if (text.includes("next week")) {
    const match = days.find((d) => text.includes(d));

    if (match) {
      const targetDay = days.indexOf(match);

      const result = new Date(today);

      const currentDay = result.getDay();
      const daysUntilNextMonday = (7 - currentDay + 1) % 7 || 7;

      result.setDate(result.getDate() + daysUntilNextMonday);

      const diff = targetDay - result.getDay();
      result.setDate(result.getDate() + diff);

      return result;
    }
  }

  const parsed = chrono.parseDate(dateText, today, {
    forwardDate: true,
  });

  if (!parsed) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }

  return parsed;
}

function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid date";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

module.exports = { getNextTaskId, resolveDate, formatDate };
