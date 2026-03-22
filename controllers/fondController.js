const Fond = require("../model/Fond");

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
