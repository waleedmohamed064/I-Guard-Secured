const AuditLog = require("../models/AuditLog");

/**
 * ✅ Audit Logger Service
 * Records every significant action in the system.
 * Critical for cybersecurity accountability and incident investigation.
 */
async function logAction({ userId, username, action, query = null, resultsCount = null, req, status = "SUCCESS" }) {
  try {
    const ipAddress =
      req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req?.socket?.remoteAddress ||
      null;

    const userAgent = req?.headers?.["user-agent"] || null;

    await AuditLog.create({
      userId,
      username,
      action,
      query,
      resultsCount,
      ipAddress,
      userAgent,
      status,
    });
  } catch (error) {
    // Never let audit logging crash the app — just warn
    console.warn("Audit log write failed:", error.message);
  }
}

/**
 * Get audit logs for a specific user (their own history)
 */
async function getUserLogs(userId, limit = 50) {
  return AuditLog.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("-__v")
    .lean();
}

/**
 * Get all audit logs (admin only)
 */
async function getAllLogs(limit = 100) {
  return AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("-__v")
    .lean();
}

module.exports = { logAction, getUserLogs, getAllLogs };
