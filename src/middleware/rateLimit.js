const rateLimit = require('express-rate-limit');

// Per-IP limit for all API routes.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down' },
});

// Per-player limit for score submissions (runs after requireAuth).
const scoreLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `player:${req.playerId}`,
  message: { error: 'Too many score submissions' },
});

module.exports = { apiLimiter, scoreLimiter };
