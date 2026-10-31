/**
 * LinkedOut Production Error Handler & Sensitive File Blocker
 * Suppresses stack traces and sensitive error leakage in production.
 * Prevents direct HTTP enumeration of hidden/exposed files (.git, .env, backups).
 */

const crypto = require('crypto');

/**
 * Sensitive File Access Interceptor
 * Explicitly rejects requests attempting to access dotfiles, environment files, or source maps
 */
function blockExposedFiles(req, res, next) {
  const urlPath = req.path.toLowerCase();

  const forbiddenPatterns = [
    /^\/\.env/i,
    /^\/\.git/i,
    /package\.json/i,
    /package-lock\.json/i,
    /\.bak$/i,
    /\.swp$/i,
    /\.sql$/i,
    /\.sqlite/i,
    /\.pem$/i,
    /\.key$/i
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(urlPath)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Direct access to configuration or system files is strictly prohibited.'
      });
    }
  }

  next();
}

/**
 * Global Production-Safe Error Handler
 * Hides stack traces, turns off debug leakage, and issues an incident correlation ID.
 */
function globalErrorHandler(err, req, res, next) {
  const incidentId = crypto.randomBytes(6).toString('hex');

  // Secure server-side logging (retains full trace only on server console)
  console.error(`[INCIDENT-${incidentId}] ${req.method} ${req.url} - Error: ${err.message}`);
  if (process.env.DEBUG === 'true') {
    console.error(err.stack);
  }

  // Client receives clean, sanitized response without stack traces or internal paths
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: status === 500
      ? 'An unexpected internal error occurred. Our security systems have logged this event.'
      : (err.message || 'Request could not be processed.'),
    incidentId: `ERR-${incidentId}`
  });
}

module.exports = {
  blockExposedFiles,
  globalErrorHandler
};
