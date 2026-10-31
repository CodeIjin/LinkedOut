/**
 * LinkedOut Authentication API
 * Provides secure user registration, bcrypt-12 password hashing,
 * and JWT session management with HttpOnly cookies.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword,
  generateBurnerAlias
} = require('../models/store');
const { JWT_SECRET } = require('../config/security');

const router = express.Router();

/**
 * Helper to issue JWT token and secure cookie
 */
function issueTokenResponse(user, res) {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      anonymousAlias: user.anonymousAlias
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Set secure HTTP-only cookie
  res.cookie('linkedout_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      anonymousAlias: user.anonymousAlias,
      avatarBg: user.avatarBg
    }
  });
}

/**
 * POST /api/auth/register
 * Creates new account with bcrypt-12 hashing
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, anonymousAlias } = req.body;

    // Validate inputs
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 3 characters long.'
      });
    }

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address for account recovery.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long for your security.'
      });
    }

    // Check duplicate username
    const existing = await findUserByUsername(username);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Username is already claimed. Choose another alias.'
      });
    }

    const newUser = await createUser({
      username: username.trim(),
      email: email.trim(),
      password,
      anonymousAlias: anonymousAlias ? anonymousAlias.trim() : generateBurnerAlias('LinkedOut')
    });

    return issueTokenResponse(newUser, res);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Registration failed due to a server error.'
    });
  }
});

/**
 * POST /api/auth/login
 * Verifies credentials and issues JWT
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both username and password.'
      });
    }

    const user = await findUserByUsername(username);
    if (!user) {
      // Use generic error to prevent account enumeration
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials provided.'
      });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials provided.'
      });
    }

    return issueTokenResponse(user, res);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Login failed due to a server error.'
    });
  }
});

/**
 * POST /api/auth/logout
 * Clears session cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('linkedout_token', {
    httpOnly: true,
    sameSite: 'strict'
  });
  return res.json({ success: true, message: 'Successfully logged out.' });
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user context
 */
router.get('/me', optionalAuth, async (req, res) => {
  if (!req.user) {
    return res.json({
      success: true,
      authenticated: false,
      user: null
    });
  }

  const user = await findUserById(req.user.id);
  if (!user) {
    return res.json({
      success: true,
      authenticated: false,
      user: null
    });
  }

  return res.json({
    success: true,
    authenticated: true,
    user
  });
});

/**
 * GET /api/auth/random-alias
 * Generates fresh whistleblower burner alias
 */
router.get('/random-alias', (req, res) => {
  const alias = generateBurnerAlias('LinkedOut');
  return res.json({ success: true, alias });
});

module.exports = router;
