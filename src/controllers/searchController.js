const { fetchAhmiaResults } = require("../services/searchService");
const { logAction } = require("../services/auditService");
const SearchHistory = require("../models/SearchHistory");

const MAX_QUERY_LENGTH = 200;

async function search(req, res) {
  const query = String(req.body.query || "").trim();

  if (!query) {
    return res.status(400).json({ error: "Search query is required." });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({
      error: `Search query must not exceed ${MAX_QUERY_LENGTH} characters.`,
    });
  }

  try {
    const results = await fetchAhmiaResults(query);

    // ✅ Determine the dominant threat category in results
    const categoryCounts = results.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {});
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Other";

    // ✅ Save to search history
    await SearchHistory.create({
      userId: req.user._id,
      query,
      resultsCount: results.length,
      topCategory,
      results: results.slice(0, 10), // store top 10 only
    });

    // ✅ Audit log the search
    await logAction({
      userId: req.user._id,
      username: req.user.username,
      action: "SEARCH",
      query,
      resultsCount: results.length,
      req,
      status: "SUCCESS",
    });

    return res.json({ results });
  } catch (error) {
    // ✅ Log failed searches too
    await logAction({
      userId: req.user._id,
      username: req.user.username,
      action: "SEARCH",
      query,
      req,
      status: "FAILED",
    });

    return res.status(502).json({
      error: error.message || "Failed to fetch search results.",
    });
  }
}

// ✅ Get current user's search history
async function getHistory(req, res) {
  try {
    const history = await SearchHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("query resultsCount topCategory createdAt")
      .lean();

    return res.json({ history });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch search history." });
  }
}

// ✅ Export search history as JSON or CSV
async function exportHistory(req, res) {
  try {
    const format = String(req.query.format || "json").toLowerCase();
    const history = await SearchHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    if (format === "csv") {
      const rows = [
        ["Date", "Query", "Results Count", "Top Category"],
        ...history.map((h) => [
          new Date(h.createdAt).toISOString(),
          `"${h.query.replace(/"/g, '""')}"`,
          h.resultsCount,
          h.topCategory,
        ]),
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=search-history.csv");
      return res.send(csv);
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=search-history.json");
    return res.json({ exportedAt: new Date().toISOString(), history });
  } catch (error) {
    return res.status(500).json({ error: "Failed to export history." });
  }
}

module.exports = { search, getHistory, exportHistory };
