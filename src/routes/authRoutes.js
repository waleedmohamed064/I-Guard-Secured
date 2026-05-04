const express = require("express");
const { login, logout, logoutAll, me, register } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { getUserLogs } = require("../services/auditService");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/logout-all", authMiddleware, logoutAll);
router.get("/me", authMiddleware, me);

// ✅ User can see their own audit trail
router.get("/activity", authMiddleware, async (req, res) => {
  try {
    const logs = await getUserLogs(req.user._id, 50);
    return res.json({ logs });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch activity log." });
  }
});

module.exports = router;
