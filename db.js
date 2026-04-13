const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGO_URI);

let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("taskcord");
    console.log("MongoDB connected");
  }
  return db;
}

module.exports = connectDB;
