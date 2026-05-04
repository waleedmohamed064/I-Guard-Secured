const User = require("../models/User");
const { AUTH_COOKIE_NAME, clearAuthCookie, verifyToken } = require("../services/authService");

async function attachUserIfPresent(req, res, next) {
  try {
    const token = req.cookies[AUTH_COOKIE_NAME];

    if (!token) {
      req.user = null;
      return next();
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.userId).select("-password");

    if (!user) {
      clearAuthCookie(res);
      req.user = null;
      return next();
    }

    // ✅ Token version check — invalidates old tokens after logout-all
    if (payload.tokenVersion !== user.tokenVersion) {
      clearAuthCookie(res);
      req.user = null;
      return next();
    }

    req.user = user;
    return next();
  } catch (error) {
    clearAuthCookie(res);
    req.user = null;
    return next();
  }
}

async function authMiddleware(req, res, next) {
  await attachUserIfPresent(req, res, () => {});

  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  return next();
}

module.exports = {
  attachUserIfPresent,
  authMiddleware,
};
