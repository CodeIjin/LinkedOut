/**
 * LinkedOut Admin & Moderation API
 * Protected route suite accessible solely by system administrators.
 */

const express = require('express');
const { requireAdmin } = require('../middleware/admin');
const { optionalAuth } = require('../middleware/auth');
const {
  getSecurityAuditLogs,
  getAllPosts,
  deletePost,
  getSanitizedSecurityProfile
} = require('../models/store');
const { getSanitizedSecurityProfile: getSecProfile } = require('../config/security');

const router = express.Router();

// Enforce auth check + requireAdmin on all /api/admin endpoints
router.use(optionalAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/overview
 * High-level system & moderation statistics
 */
router.get('/overview', (req, res) => {
  const posts = getAllPosts();
  const logs = getSecurityAuditLogs();

  return res.json({
    success: true,
    data: {
      totalPosts: posts.length,
      auditEventsRecorded: logs.length,
      serverUptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      securityStatus: getSecProfile()
    }
  });
});

/**
 * GET /api/admin/audit-logs
 * Tamper-evident zero-PII security audit trail
 */
router.get('/audit-logs', (req, res) => {
  const logs = getSecurityAuditLogs();
  return res.json({
    success: true,
    logs
  });
});

/**
 * DELETE /api/admin/posts/:id
 * Moderator removal of abusive/violating submission
 */
router.delete('/posts/:id', (req, res) => {
  const deleted = deletePost(req.params.id, null, true);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Post not found or already deleted.' });
  }
  return res.json({ success: true, message: 'Post successfully moderated by Admin.' });
});

module.exports = router;
