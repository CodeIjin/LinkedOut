/**
 * LinkedOut Admin Gatekeeper
 * Strictly protects administrative and moderation routes.
 * Employs timing-safe cryptographic comparisons to thwart side-channel timing attacks.
 */

const crypto = require('crypto');
const { ADMIN_API_KEY, ADMIN_PASSWORD } = require('../config/security');

/**
 * Timing-safe string comparison
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Middleware: Strictly requires Admin privileges
 */
function requireAdmin(req, res, next) {
  // Check if authenticated user has admin role
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  // Check for admin API header (for automated scripts or dashboard access)
  const providedKey = req.headers['x-admin-key'];
  if (providedKey && (safeCompare(providedKey, ADMIN_API_KEY) || (ADMIN_PASSWORD && safeCompare(providedKey, ADMIN_PASSWORD)))) {
    req.isAdmin = true;
    return next();
  }

  // Deny access
  return res.status(403).json({
    success: false,
    error: 'Access Forbidden: Administrator privileges required.'
  });
}

module.exports = {
  requireAdmin,
  safeCompare
};
