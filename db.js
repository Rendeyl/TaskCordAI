const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGO_URI);

let db;

async function connectDB() {
  if (!db) {
    await client.connect();

    db = client.db("taskcord");

    // One counter per user
    await db
      .collection("counters")
      .createIndex({ userId: 1 }, { unique: true });

    // Task IDs must be unique within each user
    await db
      .collection("tasks")
      .createIndex({ userId: 1, taskId: 1 }, { unique: true });

    console.log("MongoDB connected");
  }

  return db;
}

module.exports = connectDB;
