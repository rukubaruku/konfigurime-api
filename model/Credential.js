const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/crypto");

const credentialSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    username: { type: String, default: "" },
    password: { type: String, default: "" },
    url: { type: String, default: "" },
    note: { type: String, default: "" },
    time: { type: String, default: "" },
  },
  { timestamps: true },
);

credentialSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = encrypt(this.password);
  }
});

credentialSchema.methods.getDecryptedPassword = function () {
  if (!this.password) return "";
  return decrypt(this.password);
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
