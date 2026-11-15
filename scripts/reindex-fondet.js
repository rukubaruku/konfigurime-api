/*
 * Re-parses every record in the "fonds" collection with utils/fondParser.js
 * (adds fondCode/yearCode/fileCode/scanDate/location/recycled) and replaces
 * the old indexes with the ones the new search uses.
 *
 * Usage:
 *   NODE_ENV=production node scripts/reindex-fondet.js
 *
 * Safe to run more than once.
 */
const path = require("path");
require("dotenv").config({
  path: path.join(
    __dirname,
    "..",
    `.env.${process.env.NODE_ENV || "development"}`,
  ),
});

const mongoose = require("mongoose");
const Fond = require("../model/Fond");
const { parseFondPath } = require("../utils/fondParser");

const BATCH_SIZE = 1000;

(async () => {
  await mongoose.connect(process.env.DB_MONGODB_URI);
  const col = Fond.collection;
  const total = await col.countDocuments();
  console.log(`Records: ${total}`);

  let processed = 0;
  let batch = [];

  const flush = async () => {
    if (!batch.length) return;
    const ops = batch.map(({ _id, doc }) => ({
      updateOne: {
        filter: { _id },
        update: { $set: doc, $unset: { level1: "", date: "" } },
      },
    }));
    await col.bulkWrite(ops, { ordered: false });
    processed += batch.length;
    batch = [];
    process.stdout.write(`\r${processed} / ${total}`);
  };

  const cursor = col.find({}, { projection: { fullPath: 1 } });
  for await (const raw of cursor) {
    const doc = parseFondPath(raw.fullPath);
    if (!doc) continue;
    delete doc.fullPath; // never change the stored path
    batch.push({ _id: raw._id, doc });
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();
  console.log("");

  console.log("Updating indexes...");
  await Fond.syncIndexes();
  console.log("Done.");

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
