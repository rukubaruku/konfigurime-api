const mongoose = require("mongoose");

// See utils/fondParser.js for how each path is split into these fields.
const fondSchema = new mongoose.Schema(
  {
    fullPath: {
      type: String,
      required: true,
      unique: true,
    },
    location: String,
    scanDate: String, // "05.01.2026"
    recycled: { type: Boolean, default: false },

    // Normalized search keys: "1018", "2015", "859"
    fondCode: String,
    yearCode: String,
    fileCode: String,

    // Original segments as written in the path: "F.1018", "2015", "859"
    fond: String,
    year: String,
    file: String,

    // legacy fields from the first importer
    level1: String,
    date: String,
  },
  {
    timestamps: true,
  },
);

fondSchema.index({ fondCode: 1, yearCode: 1, fileCode: 1 });
fondSchema.index({ fondCode: 1, fileCode: 1 });
fondSchema.index({ fileCode: 1 });
fondSchema.index({ yearCode: 1 });

module.exports = mongoose.model("Fond", fondSchema);
