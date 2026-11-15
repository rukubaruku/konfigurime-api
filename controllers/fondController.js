const Fond = require("../model/Fond");
const {
  parseFondPath,
  normalizeFond,
  normalizeCode,
} = require("../utils/fondParser");
const fs = require("fs");
const path = require("path");

const MAX_RESULTS = 500;

/**
 * GET /fondet/search?fond=1018&year=2015&file=857
 * Each field is an exact match ("1018" finds F.1018, not F.10180). Empty
 * fields match anything, so fond=1018&file=857 finds F.1018\<any>\857.
 */
exports.searchFond = async (req, res) => {
  const fond = normalizeFond(req.query.fond);
  const year = normalizeCode(req.query.year);
  const file = normalizeCode(req.query.file);

  if (!fond && !year && !file) {
    return res.json({ success: true, data: [], total: 0 });
  }

  try {
    const filter = {};
    if (fond) filter.fondCode = fond;
    if (year) filter.yearCode = year;
    if (file) filter.fileCode = file;

    // Prefer the deepest entries (fond\year\file); parent folders such as
    // "F.1018" or "F.1018\2015" are only shown when nothing deeper exists.
    let query = { ...filter, fileCode: file || { $ne: null } };
    let total = await Fond.countDocuments(query);
    if (total === 0 && !file) {
      query = filter;
      total = await Fond.countDocuments(query);
    }

    const data = await Fond.find(query)
      .select(
        "fullPath location scanDate recycled fond year file fondCode yearCode fileCode",
      )
      .collation({ locale: "en", numericOrdering: true })
      .sort({ recycled: 1, fondCode: 1, yearCode: 1, fileCode: 1, fullPath: 1 })
      .limit(MAX_RESULTS)
      .allowDiskUse(true)
      .lean();

    res.json({ success: true, data, total, limit: MAX_RESULTS });
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

      // This importer has always stored paths without the drive letter.
      const docs = lines
        .map((line) => parseFondPath(line.replace(/^[A-Za-z]:[/\\]/, "")))
        .filter(Boolean);

      importStatus.total = docs.length;

      // Process in batches of 500 to avoid memory spikes
      const BATCH_SIZE = 500;
      let inserted = 0;

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = docs.slice(i, i + BATCH_SIZE);
        const bulkOps = batch.map((doc) => ({
          updateOne: {
            filter: { fullPath: doc.fullPath },
            // $set so re-importing also refreshes the parsed fields
            update: { $set: doc },
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
