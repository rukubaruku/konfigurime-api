const { rateLimit } = require("express-rate-limit");

const message = {
  success: false,
  message: "Too many attempts. Please try again later.",
};

// Password and 2FA attempts, per IP.
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
});

// Everything else: generous, only meant to stop scraping / abuse.
exports.apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
});
