const mongoose = require("mongoose");

const fondSchema = new mongoose.Schema(
  {
    fullPath: {
      type: String,
      required: true,
      unique: true,
    },
    level1: String,
    date: String,
    fond: String,
    year: String,
    file: String,
  },
  {
    timestamps: true,
  },
);

fondSchema.index({ fullPath: "text" });

fondSchema.index({ level1: 1 });
fondSchema.index({ date: 1 });
fondSchema.index({ fond: 1 });
fondSchema.index({ year: 1 });
fondSchema.index({ file: 1 });

module.exports = mongoose.model("Fond", fondSchema);
