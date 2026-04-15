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

  const prefix = prefixMap[subject] || "TSK";

  const counters = db.collection("counters");

  const updated = await counters.findOneAndUpdate(
    { subject },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  const number = updated?.value?.count ?? 1;

  return `${prefix}${String(number).padStart(3, "0")}`;
}

module.exports = { getNextTaskId };
