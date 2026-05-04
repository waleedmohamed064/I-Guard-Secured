const mongoose = require("mongoose");

// ✅ Search History — stores each user's past searches with results summary
const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    query: {
      type: String,
      required: true,
    },
    resultsCount: {
      type: Number,
      default: 0,
    },
    topCategory: {
      type: String,
      enum: ["Malware", "Marketplace", "Forum", "Other"],
      default: "Other",
    },
    // Snapshot of results with threat scores
    results: [
      {
        title: String,
        description: String,
        link: String,
        onion: String,
        category: String,
        threatScore: Number,
        last_seen: String,
      },
    ],
  },
  { timestamps: true }
);

// Index for fast per-user history lookups
searchHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.models.SearchHistory || mongoose.model("SearchHistory", searchHistorySchema);
