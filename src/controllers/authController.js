const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { clearAuthCookie, setAuthCookie } = require("../services/authService");
const { logAction } = require("../services/auditService");
const { escapeRegExp } = require("../utils/text");
const { sanitizeUser } = require("../utils/user");

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

async function register(req, res) {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    // ✅ Username format validation
    const usernameRegex = /^[a-zA-Z0-9_\-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        error: "Username can only contain letters, numbers, underscores, and hyphens.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    const duplicateUser = await User.findOne({
      $or: [{ email }, { username: new RegExp(`^${escapeRegExp(username)}$`, "i") }],
    });

    if (duplicateUser) {
      return res.status(409).json({ error: "A user with that email or username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword });

    // ✅ Audit log
    await logAction({ userId: user._id, username: user.username, action: "REGISTER", req, status: "SUCCESS" });

    setAuthCookie(res, user._id.toString(), user.tokenVersion);
    return res.status(201).json({ message: "Registration successful.", user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to register user." });
  }
}

async function login(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // ✅ Account lockout check
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(423).json({
        error: `Account is temporarily locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        user.failedLoginAttempts = 0;
        await user.save();
        return res.status(423).json({ error: "Too many failed attempts. Account locked for 30 minutes." });
      }

      await user.save();
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // ✅ Reset lockout + audit log
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    await logAction({ userId: user._id, username: user.username, action: "LOGIN", req, status: "SUCCESS" });

    setAuthCookie(res, user._id.toString(), user.tokenVersion);
    return res.json({ message: "Login successful.", user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to login." });
  }
}

async function logout(req, res) {
  // Try to log if we can identify the user from cookie (best effort)
  clearAuthCookie(res);
  res.json({ message: "Logout successful." });
}

// ✅ Logout from ALL devices by incrementing tokenVersion
async function logoutAll(req, res) {
  try {
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
    await logAction({ userId: req.user._id, username: req.user.username, action: "LOGOUT", req, status: "SUCCESS" });
    clearAuthCookie(res);
    res.json({ message: "Logged out from all devices." });
  } catch (error) {
    res.status(500).json({ error: "Failed to logout from all devices." });
  }
}

function me(req, res) {
  res.json({ user: sanitizeUser(req.user) });
}

module.exports = { login, logout, logoutAll, me, register };
