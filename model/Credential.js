const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/crypto");

const credentialSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    username: { type: String, default: "" },
    password: { type: String, default: "" },
    url: { type: String, default: "" },
    time: { type: String, default: "" },
  },
  { timestamps: true },
);

// Passwords are encrypted with AES-256-GCM (see utils/crypto.js) and are only
// decrypted on the dedicated "reveal password" endpoint.
credentialSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = encrypt(this.password);
  }
});

credentialSchema.methods.getDecryptedPassword = function () {
  if (!this.password) return "";
  return decrypt(this.password);
};

credentialSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

credentialSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("Credential", credentialSchema);
