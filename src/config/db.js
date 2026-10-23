const mongoose = require('mongoose');
const { env } = require('./env');

async function connectDB(dbName = env.MONGODB_DB_NAME) {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGODB_URI, {
    dbName,
    maxPoolSize: 10, // Small pool for the free M0 tier
    serverSelectionTimeoutMS: 10000, // Fail fast if Atlas is unreachable
    autoIndex: env.NODE_ENV !== 'production',
  });

  console.log(`MongoDB connected: ${mongoose.connection.name}`);

  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
}

async function disconnectDB() {
  await mongoose.connection.close();
}

module.exports = { connectDB, disconnectDB };
