const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { env } = require('./config/env');
const { requireDB } = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Vercel/free hosts sit behind one proxy; needed for per-IP rate limits
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '10kb' }));

  const api = express.Router();
  api.use(apiLimiter);
  api.use(requireDB); // serverless: connect (or reuse the cached connection) before any route
  api.use(require('./routes/health.routes'));
  api.use(require('./routes/player.routes'));
  api.use(require('./routes/score.routes'));
  app.use('/api/v1', api);

  // Public web leaderboard at "/" — shareable link, no app needed.
  app.use(apiLimiter, requireDB, require('./routes/web.routes'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

// Vercel imports this module and uses the exported Express app as the request handler.
// Local runs (`npm start`) go through src/index.js instead.
const app = createApp();
app.createApp = createApp;

module.exports = app;
