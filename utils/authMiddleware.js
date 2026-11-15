const User = require("../model/User");
const { verifyAccessToken } = require("./tokens");

/**
 * Requires a valid access token (Authorization: Bearer <token>) belonging to
 * an existing user whose sessions have not been revoked.
 */
exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
  }

  try {
    const user = await User.findById(decoded.id).select("name tokenVersion");
    if (!user || (user.tokenVersion || 0) !== (decoded.tv || 0)) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    req.user = { id: String(user._id), name: user.name };
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
