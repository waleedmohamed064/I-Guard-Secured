const express = require("express");
const { search, getHistory, exportHistory } = require("../controllers/searchController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, search);
router.get("/history", authMiddleware, getHistory);           // ✅ Search history
router.get("/history/export", authMiddleware, exportHistory); // ✅ Export as JSON or CSV

module.exports = router;
