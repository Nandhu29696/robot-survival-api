const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { env } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.set('trust proxy', 1); // free hosts sit behind one proxy; needed for per-IP rate limits
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '10kb' }));

  const api = express.Router();
  api.use(apiLimiter);
  api.use(require('./routes/health.routes'));
  api.use(require('./routes/player.routes'));
  api.use(require('./routes/score.routes'));
  app.use('/api/v1', api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
