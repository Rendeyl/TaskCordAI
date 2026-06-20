const chrono = require("chrono-node");

function resolveDate(dateText) {
  if (!dateText) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }

  const today = new Date();

  const parsed = chrono.parseDate(dateText, today, {
    forwardDate: true,
  });

  if (!parsed) {
    // fallback: tomorrow
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
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

function getDaysLeft(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

module.exports = {
  resolveDate,
  formatDate,
  getDaysLeft,
};
