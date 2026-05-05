const Fond = require("../model/Fond");
const fs = require("fs");
const path = require("path");

exports.searchFond = async (req, res) => {
  let { fond, year, file } = req.query;

  fond = fond?.trim();
  year = year?.trim();
  file = file?.trim();

  if (!fond && !year && !file) {
    return res.json({ success: true, data: [] });
  }

  try {
    const exactFilter = {};
    if (fond) exactFilter.fond = fond;
    if (year) exactFilter.year = year;
    if (file) exactFilter.file = file;

    const exactMatches = await Fond.find(exactFilter).limit(100);
    let results = [...exactMatches];

    if (results.length < 100) {
      const fuzzyFilter = { $and: [] };
      if (fond)
        fuzzyFilter.$and.push({ fond: { $regex: fond, $options: "i" } });
      if (year)
        fuzzyFilter.$and.push({ year: { $regex: year, $options: "i" } });
      if (file)
        fuzzyFilter.$and.push({ file: { $regex: `^${file}$`, $options: "" } });
      if (exactMatches.length) {
        fuzzyFilter._id = { $nin: exactMatches.map((item) => item._id) };
      }

      const fuzzyMatches = await Fond.find(fuzzyFilter).limit(
        100 - results.length,
      );
      results = [...results, ...fuzzyMatches];
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error("Fondet search error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// In-memory import status tracker
const importStatus = {
  running: false,
  done: false,
  total: 0,
  inserted: 0,
  skipped: 0,
  error: null,
};

exports.importFondet = async (req, res) => {
  if (importStatus.running) {
    return res.json({
      success: true,
      status: "running",
      message:
        "Import already in progress. Poll /fondet/import-status for updates.",
    });
  }

  const filePath = path.join(__dirname, "../Fondet e skanuara.txt");

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: "File 'Fondet e skanuara.txt' not found in project root.",
    });
  }

  // Respond immediately so Cloudflare doesn't time out
  res.json({
    success: true,
    status: "started",
    message:
      "Import started in background. Poll /fondet/import-status for progress.",
  });

  // Reset status
  importStatus.running = true;
  importStatus.done = false;
  importStatus.error = null;
  importStatus.total = 0;
  importStatus.inserted = 0;
  importStatus.skipped = 0;

  // Run in background (no await on purpose)
  (async () => {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const lines = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const docs = [];
      for (const line of lines) {
        const normalized = line
          .replace(/^[A-Za-z]:[/\\]/, "")
          .replace(/[/\\]+$/, "")
          .trim();
        if (!normalized) continue;

        const parts = normalized.split(/[/\\]/);
        docs.push({
          fullPath: normalized,
          level1: parts[0] || null,
          date: parts[1] || null,
          fond: parts[2] || null,
          year: parts[3] || null,
          file: parts[4] || null,
        });
      }

      importStatus.total = docs.length;

      // Process in batches of 500 to avoid memory spikes
      const BATCH_SIZE = 500;
      let inserted = 0;

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = docs.slice(i, i + BATCH_SIZE);
        const bulkOps = batch.map((doc) => ({
          updateOne: {
            filter: { fullPath: doc.fullPath },
            update: { $setOnInsert: doc },
            upsert: true,
          },
        }));
        const result = await Fond.bulkWrite(bulkOps, { ordered: false });
        inserted += result.upsertedCount || 0;
      }

      importStatus.inserted = inserted;
      importStatus.skipped = docs.length - inserted;
      importStatus.done = true;
    } catch (err) {
      console.error("Import error:", err);
      importStatus.error = err.message;
      importStatus.done = true;
    } finally {
      importStatus.running = false;
    }
  })();
};

exports.getImportStatus = (req, res) => {
  res.json({ success: true, ...importStatus });
};
