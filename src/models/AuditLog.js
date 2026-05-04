const mongoose = require("mongoose");

// ✅ Audit Log — records every search action for cybersecurity accountability
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ["SEARCH", "LOGIN", "LOGOUT", "REGISTER"],
      required: true,
    },
    query: {
      type: String,
      default: null,
    },
    resultsCount: {
      type: Number,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
    },
  },
  { timestamps: true }
);

// Index for fast queries by user and date
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
