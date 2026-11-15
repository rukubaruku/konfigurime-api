const mongoose = require("mongoose");
const { encrypt, safeDecrypt } = require("../utils/crypto");

// `code` may contain hostnames, passwords, tokens etc., so it is stored
// encrypted (AES-256-GCM) and transparently decrypted when sent to the client.
const commandSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      set: (value) => encrypt(value),
      get: (value) => safeDecrypt(value, { legacy: false }),
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
    id: false,
  },
);

module.exports = mongoose.model("Command", commandSchema);
