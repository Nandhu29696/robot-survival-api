const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function required(name) {
  const value = process.env[name];
  if (!value || value.includes('<password>') || value.startsWith('replace-with')) {
    throw new Error(`Environment variable ${name} is missing or still a placeholder (see server/.env.example)`);
  }
  return value;
}

function int(name, fallback) {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: int('PORT', 3000),
  MONGODB_URI: required('MONGODB_URI'),
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'robot_survival_dev',
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  MAX_SCORE_PER_SECOND: int('MAX_SCORE_PER_SECOND', 250),
  MAX_RUN_SECONDS: int('MAX_RUN_SECONDS', 3600),
  WAVE_SECONDS: int('WAVE_SECONDS', 30),
};

if (env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

module.exports = { env };
