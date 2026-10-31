/**
 * LinkedOut Input Sanitizer & XSS Shield
 * Strips script tags, unsafe HTML, inline event handlers, and malicious protocols.
 */

const sanitizeHtml = require('sanitize-html');

// Strict sanitization options - completely strip all HTML tags for user submissions
const strictOptions = {
  allowedTags: [], // No HTML tags permitted in raw text fields (pure text)
  allowedAttributes: {},
  disallowedTagsMode: 'discard'
};

// Slightly permissive options for rich story content if user formats with bold/italic
const storyOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'code'],
  allowedAttributes: {},
  disallowedTagsMode: 'discard'
};

/**
 * Deep sanitization function that cleans strings recursively in objects
 */
function sanitizeValue(value, isStoryBody = false) {
  if (typeof value === 'string') {
    // Pick options based on field type
    const opts = isStoryBody ? storyOptions : strictOptions;
    return sanitizeHtml(value.trim(), opts);
  } else if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, isStoryBody));
  } else if (value !== null && typeof value === 'object') {
    const cleaned = {};
    for (const key of Object.keys(value)) {
      cleaned[key] = sanitizeValue(value[key], key === 'story' || key === 'content');
    }
    return cleaned;
  }
  return value;
}

/**
 * Express middleware to sanitize req.body, req.query, and req.params
 */
function sanitizeInputMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
}

/**
 * Direct string sanitizer for testing / ad-hoc usage
 */
function cleanText(text, allowBasicFormatting = false) {
  if (typeof text !== 'string') return '';
  return sanitizeHtml(text.trim(), allowBasicFormatting ? storyOptions : strictOptions);
}

module.exports = {
  sanitizeInputMiddleware,
  cleanText
};
