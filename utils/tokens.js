const jwt = require("jsonwebtoken");

const ALGORITHM = "HS256";

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";
const TWO_FACTOR_TTL = "5m";

const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/user",
};

const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, type: "access", tv: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL, algorithm: ALGORITHM },
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { id: user._id, type: "refresh", tv: user.tokenVersion },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TTL, algorithm: ALGORITHM },
  );

// Short-lived token proving the password step succeeded; it can only be
// exchanged for real tokens at /user/2fa/verify together with a valid code.
const signTwoFactorToken = (user) =>
  jwt.sign(
    { id: user._id, type: "2fa", tv: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: TWO_FACTOR_TTL, algorithm: ALGORITHM },
  );

const verifyTyped = (token, secret, type) => {
  const decoded = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
  if (decoded.type !== type) throw new Error("Wrong token type");
  return decoded;
};

const verifyAccessToken = (token) =>
  verifyTyped(token, process.env.JWT_SECRET, "access");
const verifyRefreshToken = (token) =>
  verifyTyped(token, process.env.JWT_REFRESH_SECRET, "refresh");
const verifyTwoFactorToken = (token) =>
  verifyTyped(token, process.env.JWT_SECRET, "2fa");

const setRefreshCookie = (res, user) => {
  res.cookie(REFRESH_COOKIE, signRefreshToken(user), {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTIONS);
  // Also clear the cookie set by older versions (path "/")
  res.clearCookie(REFRESH_COOKIE, { ...REFRESH_COOKIE_OPTIONS, path: "/" });
};

module.exports = {
  REFRESH_COOKIE,
  signAccessToken,
  signTwoFactorToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyTwoFactorToken,
  setRefreshCookie,
  clearRefreshCookie,
};
