const crypto = require("crypto");
const bcrypt = require("bcrypt");
const QRCode = require("qrcode");
const User = require("../model/User");
const { encrypt, decrypt } = require("../utils/crypto");
const totp = require("../utils/totp");
const {
  REFRESH_COOKIE,
  signAccessToken,
  signTwoFactorToken,
  verifyRefreshToken,
  verifyTwoFactorToken,
  setRefreshCookie,
  clearRefreshCookie,
} = require("../utils/tokens");

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const RECOVERY_CODE_COUNT = 10;
const TOTP_ISSUER = process.env.TOTP_ISSUER || "Konfigurime";

// Used to keep response time constant when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_ROUNDS);

const serverError = (res, error) => {
  console.error(error);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  twoFactorEnabled: Boolean(user.twoFactorEnabled),
});

const hashRecoveryCode = (code) =>
  crypto
    .createHash("sha256")
    .update(code.replace(/[\s-]/g, "").toUpperCase())
    .digest("hex");

const generateRecoveryCodes = () =>
  Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });

const registerFailedAttempt = async (user) => {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    user.failedLoginAttempts = 0;
  }
  await user.save();
};

const lockedResponse = (res) =>
  res.status(429).json({
    success: false,
    message: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.`,
  });

const issueSession = async (res, user) => {
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  setRefreshCookie(res, user);

  return res.status(200).json({
    success: true,
    token: signAccessToken(user),
    user: publicUser(user),
  });
};

/**
 * Checks a TOTP code (or a single-use recovery code) for a user with 2FA
 * enabled. Rejects codes that were already used (replay protection) and
 * consumes recovery codes. Returns true on success.
 */
const checkSecondFactor = (user, code) => {
  const value = String(code || "").trim();

  if (/^\d{6}$/.test(value.replace(/\s/g, ""))) {
    const step = totp.verifyTotp(decrypt(user.twoFactorSecret), value);
    if (step === null) return false;
    if (
      user.twoFactorLastUsedStep !== null &&
      user.twoFactorLastUsedStep !== undefined &&
      step <= user.twoFactorLastUsedStep
    ) {
      return false; // code already used
    }
    user.twoFactorLastUsedStep = step;
    return true;
  }

  const hashed = hashRecoveryCode(value);
  const index = user.twoFactorRecoveryCodes.indexOf(hashed);
  if (index === -1) return false;
  user.twoFactorRecoveryCodes.splice(index, 1);
  return true;
};

/* ------------------------------------------------------------------ */
/* Login / session                                                     */
/* ------------------------------------------------------------------ */

exports.login = async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    const user = await User.findOne({ email: email.trim() });

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({
        success: false,
        message: "Incorrect credentials",
      });
    }

    if (user.isLocked()) return lockedResponse(res);

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      await registerFailedAttempt(user);
      return res.status(401).json({
        success: false,
        message: "Incorrect credentials",
      });
    }

    if (user.twoFactorEnabled) {
      return res.status(200).json({
        success: true,
        twoFactorRequired: true,
        twoFactorToken: signTwoFactorToken(user),
      });
    }

    return issueSession(res, user);
  } catch (error) {
    return serverError(res, error);
  }
};

exports.verifyTwoFactorLogin = async (req, res) => {
  const { twoFactorToken, code } = req.body || {};

  if (!twoFactorToken || !code) {
    return res.status(400).json({
      success: false,
      message: "Verification code is required",
    });
  }

  let decoded;
  try {
    decoded = verifyTwoFactorToken(twoFactorToken);
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Login session expired. Please sign in again.",
    });
  }

  try {
    const user = await User.findById(decoded.id);
    if (
      !user ||
      !user.twoFactorEnabled ||
      (user.tokenVersion || 0) !== (decoded.tv || 0)
    ) {
      return res.status(401).json({
        success: false,
        message: "Login session expired. Please sign in again.",
      });
    }

    if (user.isLocked()) return lockedResponse(res);

    if (!checkSecondFactor(user, code)) {
      await registerFailedAttempt(user);
      return res.status(401).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    return issueSession(res, user);
  } catch (error) {
    return serverError(res, error);
  }
};

exports.refreshToken = async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No refresh token",
    });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);

    if (!user || (user.tokenVersion || 0) !== (decoded.tv || 0)) {
      clearRefreshCookie(res);
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    return res.status(200).json({
      success: true,
      token: signAccessToken(user),
    });
  } catch (err) {
    clearRefreshCookie(res);
    return res.status(403).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

exports.logout = async (req, res) => {
  // Revoke every token issued so far for this user (if we can identify them).
  const token = req.cookies[REFRESH_COOKIE];
  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await User.updateOne(
        { _id: decoded.id, tokenVersion: decoded.tv || 0 },
        { $inc: { tokenVersion: 1 } },
      );
    } catch (err) {
      // invalid/expired token: nothing to revoke
    }
  }

  clearRefreshCookie(res);

  return res.status(200).json({
    success: true,
    message: "Logged out",
  });
};

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: publicUser(user),
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// Kept for backwards compatibility with GET /user/:id, but a user can only
// read their own profile.
exports.getUserById = async (req, res) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }
  return exports.getCurrentUser(req, res);
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      !name ||
      !email
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.name = name.trim();
    user.email = email.trim();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: { name: user.name, email: user.email },
    });
  } catch (error) {
    return serverError(res, error);
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirm password do not match",
    });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(
      String(currentPassword),
      user.passwordHash,
    );
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // Sign out every other session, keep this one alive with fresh tokens.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    setRefreshCookie(res, user);

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      token: signAccessToken(user),
    });
  } catch (error) {
    return serverError(res, error);
  }
};

/* ------------------------------------------------------------------ */
/* Two-factor authentication management                                */
/* ------------------------------------------------------------------ */

exports.getTwoFactorStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({
      success: true,
      enabled: Boolean(user.twoFactorEnabled),
      recoveryCodesLeft: user.twoFactorRecoveryCodes.length,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// Step 1: generate a secret and return it as a QR code. 2FA is not active
// until the user proves they scanned it (POST /2fa/enable).
exports.setupTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: "Two-factor authentication is already enabled",
      });
    }

    const secret = totp.generateSecret();
    user.twoFactorPendingSecret = encrypt(secret);
    await user.save();

    const otpauthUrl = totp.otpauthUrl({
      secret,
      accountName: user.email,
      issuer: TOTP_ISSUER,
    });
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return res.status(200).json({
      success: true,
      secret,
      qrCode,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// Step 2: confirm with a code from the app; returns one-time recovery codes.
exports.enableTwoFactor = async (req, res) => {
  const { code } = req.body || {};

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: "Two-factor authentication is already enabled",
      });
    }
    if (!user.twoFactorPendingSecret) {
      return res.status(400).json({
        success: false,
        message: "Start the 2FA setup first",
      });
    }

    const secret = decrypt(user.twoFactorPendingSecret);
    const step = totp.verifyTotp(secret, code);
    if (step === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    const recoveryCodes = generateRecoveryCodes();

    user.twoFactorSecret = encrypt(secret);
    user.twoFactorPendingSecret = null;
    user.twoFactorEnabled = true;
    user.twoFactorLastUsedStep = step;
    user.twoFactorRecoveryCodes = recoveryCodes.map(hashRecoveryCode);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // sign out other sessions
    await user.save();
    setRefreshCookie(res, user);

    return res.status(200).json({
      success: true,
      message: "Two-factor authentication enabled",
      recoveryCodes,
      token: signAccessToken(user),
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// Requires both the account password and a current code (or recovery code).
exports.disableTwoFactor = async (req, res) => {
  const { password, code } = req.body || {};

  if (!password || !code) {
    return res.status(400).json({
      success: false,
      message: "Password and verification code are required",
    });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: "Two-factor authentication is not enabled",
      });
    }

    const passwordOk = await bcrypt.compare(String(password), user.passwordHash);
    if (!passwordOk || !checkSecondFactor(user, code)) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password or verification code",
      });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorPendingSecret = null;
    user.twoFactorLastUsedStep = null;
    user.twoFactorRecoveryCodes = [];
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    setRefreshCookie(res, user);

    return res.status(200).json({
      success: true,
      message: "Two-factor authentication disabled",
      token: signAccessToken(user),
    });
  } catch (error) {
    return serverError(res, error);
  }
};

exports.regenerateRecoveryCodes = async (req, res) => {
  const { code } = req.body || {};

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: "Two-factor authentication is not enabled",
      });
    }
    if (!checkSecondFactor(user, code)) {
      return res.status(401).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    const recoveryCodes = generateRecoveryCodes();
    user.twoFactorRecoveryCodes = recoveryCodes.map(hashRecoveryCode);
    await user.save();

    return res.status(200).json({ success: true, recoveryCodes });
  } catch (error) {
    return serverError(res, error);
  }
};
