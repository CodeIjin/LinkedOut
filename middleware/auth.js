/**
 * LinkedOut Authentication & Authorization Middleware
 * Verifies JWT tokens, extracts anonymous identities, and enforces resource ownership.
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/security');

/**
 * Extracts and verifies JWT from header or cookie
 */
function verifyToken(req) {
  let token = null;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Fallback to HttpOnly cookie if present
  if (!token && req.cookies && req.cookies.linkedout_token) {
    token = req.cookies.linkedout_token;
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware: Strictly requires authenticated user
 */
function requireAuth(req, res, next) {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in or create an anonymous account.'
    });
  }
  req.user = user;
  next();
}

/**
 * Middleware: Optional authentication (attaches user if present, proceeds otherwise)
 */
function optionalAuth(req, res, next) {
  const user = verifyToken(req);
  if (user) {
    req.user = user;
  }
  next();
}

/**
 * Middleware: Resource ownership validator
 * Guarantees a user can ONLY modify or delete their OWN posts/content.
 * Prevents Insecure Direct Object References (IDOR).
 */
function requireOwnership(getResourceOwnerId) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    // Admins can override ownership for moderation
    if (req.user.role === 'admin') {
      return next();
    }

    const ownerId = getResourceOwnerId(req);
    if (!ownerId) {
      return res.status(404).json({ success: false, error: 'Resource not found.' });
    }

    if (ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to modify or delete this resource.'
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireOwnership,
  verifyToken
};
