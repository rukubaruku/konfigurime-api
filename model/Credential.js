const mongoose = require("mongoose");

const credentialSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      default: "",
    },
    url: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    time: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

credentialSchema.pre("save", function (next) {
  if (this.isModified("password") && this.password) {
    this.password = encrypt(this.password);
  }
  next();
});

credentialSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  if (obj.password) {
    obj.password = decrypt(obj.password);
  }
  return obj;
};

module.exports = mongoose.model("Credential", credentialSchema);
