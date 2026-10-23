const mongoose = require('mongoose');
const { env } = require('./env');

// One shared connection per process. On Vercel (serverless) the app module is imported
// without running src/index.js, so routes call connectDB() on demand and later
// invocations of the same warm instance reuse this cached promise.
let connecting = null;

async function connectDB(dbName = env.MONGODB_DB_NAME) {
  if (mongoose.connection.readyState === 1) return;
  if (!connecting) {
    connecting = (async () => {
      mongoose.set('strictQuery', true);
      await mongoose.connect(env.MONGODB_URI, {
        dbName,
        maxPoolSize: 10, // Small pool for the free M0 tier
        serverSelectionTimeoutMS: 8000, // Fail fast if Atlas is unreachable
        autoIndex: false,
      });
      console.log(`MongoDB connected: ${mongoose.connection.name}`);
      mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
      mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
      // Create missing indexes (e.g. unique deviceId/playerId) once per cold start; never drops anything.
      const { Player } = require('../models/Player');
      const { Score } = require('../models/Score');
      await Promise.all([Player.createIndexes(), Score.createIndexes()]);
    })().catch((err) => {
      connecting = null; // allow a retry on the next request
      throw err;
    });
  }
  await connecting;
}

/** Express middleware: makes sure the database is connected before a route runs. */
async function requireDB(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    res.status(503).json({ error: 'Database unavailable, try again shortly' });
  }
}

async function disconnectDB() {
  await mongoose.connection.close();
  connecting = null;
}

module.exports = { connectDB, requireDB, disconnectDB };
