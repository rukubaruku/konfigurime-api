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

exports.importFondet = async (req, res) => {
  const filePath = path.join(__dirname, "../../Fondet e skanuara.txt");

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: "File 'Fondet e skanuara.txt' not found in root directory.",
    });
  }

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

      const level1 = parts[0] || null;
      const date = parts[1] || null;
      const fond = parts[2] || null;
      const year = parts[3] || null;
      const file = parts[4] || null;

      docs.push({
        fullPath: normalized,
        level1,
        date,
        fond,
        year,
        file,
      });
    }

    if (docs.length === 0) {
      return res.json({
        success: true,
        inserted: 0,
        skipped: 0,
        message: "No valid lines found.",
      });
    }

    let inserted = 0;
    let skipped = 0;

    const bulkOps = docs.map((doc) => ({
      updateOne: {
        filter: { fullPath: doc.fullPath },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    }));

    const result = await Fond.bulkWrite(bulkOps, { ordered: false });
    inserted = result.upsertedCount || 0;
    skipped = docs.length - inserted;

    return res.json({
      success: true,
      total: docs.length,
      inserted,
      skipped,
      message: `Import complete. ${inserted} new records inserted, ${skipped} already existed.`,
    });
  } catch (err) {
    console.error("Import error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error during import." });
  }
};
