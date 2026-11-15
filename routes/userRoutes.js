const express = require("express");
const userController = require("../controllers/userController");
const { verifyToken } = require("../utils/authMiddleware");
const { authLimiter } = require("../utils/rateLimiters");
const router = express.Router();

// Public
router.post("/login", authLimiter, userController.login);
router.post("/2fa/verify", authLimiter, userController.verifyTwoFactorLogin);
router.post("/refresh", userController.refreshToken);
router.post("/logout", userController.logout);

// Authenticated
router.get("/me", verifyToken, userController.getCurrentUser);
router.put("/update", verifyToken, userController.updateUser);
router.put(
  "/change-password",
  verifyToken,
  authLimiter,
  userController.changePassword,
);
router.get("/2fa/status", verifyToken, userController.getTwoFactorStatus);
router.post("/2fa/setup", verifyToken, userController.setupTwoFactor);
router.post(
  "/2fa/enable",
  verifyToken,
  authLimiter,
  userController.enableTwoFactor,
);
router.post(
  "/2fa/disable",
  verifyToken,
  authLimiter,
  userController.disableTwoFactor,
);
router.post(
  "/2fa/recovery-codes",
  verifyToken,
  authLimiter,
  userController.regenerateRecoveryCodes,
);
router.get("/:id", verifyToken, userController.getUserById);

module.exports = router;
