/**
 * LinkedOut - The Anonymous Anti-Toxic Workplace Network
 * Enterprise-grade security architecture:
 * - Helmet security headers & CSP
 * - Restrictive CORS
 * - Rate limiting on all routes
 * - XSS & HTML input sanitization
 * - Sensitive file blocking
 * - Production-safe error shielding (zero stack leaks)
 * - Zero-PII Whistleblower Engine
 */

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables securely from .env
dotenv.config();

const { PORT, CORS_ORIGIN, NODE_ENV } = require('./config/security');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitizeInputMiddleware } = require('./middleware/sanitize');
const { blockExposedFiles, globalErrorHandler } = require('./middleware/errorHandler');

// Route Handlers
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const companiesRoutes = require('./routes/companies');
const adminRoutes = require('./routes/admin');
const securityAuditRoutes = require('./routes/securityAudit');

const app = express();

// Disable 'X-Powered-By: Express' header to prevent server fingerprinting
app.disable('x-powered-by');

// 1. HTTP Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: NODE_ENV === 'production' ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  })
);

// 2. Strict CORS Configuration
const allowedOrigins = (CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin browser fetches)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS security policy.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
  })
);

// 3. Body Parsers with Size Restrictions to Prevent DoS
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 4. Cookie Parser with Secret
app.use(cookieParser(process.env.COOKIE_SECRET || 'linkedout_cookie_vault_key'));

// 5. Block Exposed / Sensitive Files (.env, .git, etc.)
app.use(blockExposedFiles);

// 6. Global Input Sanitization against XSS
app.use(sanitizeInputMiddleware);

// 7. General Rate Limiter for all API Routes
app.use('/api', generalLimiter);

// 8. Serve Static Frontend Files safely
app.use(
  express.static(path.join(__dirname, 'public'), {
    dotfiles: 'deny',
    index: 'index.html',
    maxAge: '1h'
  })
);

// 9. Register API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/security', securityAuditRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'LinkedOut Whistleblower Network',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

// Single Page Application Fallback (redirect unknown client routes to index.html)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 10. Global Error Handling Middleware (No stack trace leaks)
app.use(globalErrorHandler);

// Start Server if not imported by test suite
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🛡️  LinkedOut Anonymous Network online on port ${PORT}`);
    console.log(`🔒 Security: Helmet, CSP, Rate-Limiting & bcrypt-12 active`);
    console.log(`🌐 Local access: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully.');
    server.close(() => process.exit(0));
  });
}

module.exports = app;
