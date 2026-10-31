/**
 * LinkedOut Rate Limiting Suite
 * Thwarts brute force attacks, Denial of Service (DoS), and automated scraping/spam.
 */

const rateLimit = require('express-rate-limit');

// General API Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120, // 120 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});

// Sensitive Auth Rate Limiter (Login, Register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // 25 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. For security reasons, please wait 15 minutes.'
  }
});

// Post Creation Rate Limiter (Anti-Spam Whistleblower Shield)
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 exit stories per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Post frequency limit reached. Take a breather, your tea will keep!'
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  postLimiter
};
