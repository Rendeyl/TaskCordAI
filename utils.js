async function getNextTaskId(db, subject) {
  const prefixMap = {
    Programming: "PRO",
    Networking: "NET",
    Discrete: "DIS",
    UTS: "UTS",
    FilDis: "FIL",
    RPH: "RPH",
    ArtApp: "ART",
    PE: "PE",
    NSTP: "NSTP",
  };

  const key = subject?.trim();
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

module.exports = { getNextTaskId };
