const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },

    // Incremented on logout / password change / 2FA change. Every JWT carries
    // the version it was issued with, so bumping it revokes all sessions.
    tokenVersion: { type: Number, default: 0 },

    // Brute-force protection
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    // Two-factor authentication (TOTP). Secrets are stored encrypted.
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null },
    twoFactorPendingSecret: { type: String, default: null },
    twoFactorLastUsedStep: { type: Number, default: null },
    // SHA-256 hashes of single-use recovery codes
    twoFactorRecoveryCodes: { type: [String], default: [] },
  },
  { collection: "users" },
);

userSchema.methods.isLocked = function () {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

module.exports = mongoose.model("User", userSchema);
