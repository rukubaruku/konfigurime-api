const fs = require("fs");
const readline = require("readline");
const mongoose = require("mongoose");
const Fond = require("./model/Fond");
const { parseFondPath } = require("./utils/fondParser");
require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});

const FILE_PATH = "./Fondet e skanuara.txt";
const BATCH_SIZE = 1000;

mongoose
  .connect(process.env.DB_MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    importFile();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

async function importFile() {
  const fileStream = fs.createReadStream(FILE_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let batch = [];
  let count = 0;
  let skipped = 0;

  for await (const line of rl) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const doc = parseFondPath(trimmedLine);
    if (!doc) continue;

    batch.push({
      updateOne: {
        filter: { fullPath: doc.fullPath },
        update: { $set: doc },
        upsert: true,
      },
    });

    if (batch.length === BATCH_SIZE) {
      try {
        const res = await Fond.bulkWrite(batch, { ordered: false });
        count += res.upsertedCount;
        skipped += BATCH_SIZE - res.upsertedCount;
        console.log(`Inserted: ${count}, Skipped: ${skipped}`);
      } catch (err) {
        console.error("Batch insert error:", err.message);
      }
      batch = [];
    }
  }

  if (batch.length > 0) {
    try {
      const res = await Fond.bulkWrite(batch, { ordered: false });
      count += res.upsertedCount;
      skipped += batch.length - res.upsertedCount;
      console.log(`Inserted: ${count}, Skipped: ${skipped}`);
    } catch (err) {
      console.error("Final batch insert error:", err.message);
    }
  }

  console.log("Import complete!");
  mongoose.disconnect();
}
