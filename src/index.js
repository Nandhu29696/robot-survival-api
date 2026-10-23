const { env } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');
const { Player } = require('./models/Player');
const { Score } = require('./models/Score');

async function main() {
  await connectDB();
  // Make sure indexes exist (autoIndex is off in production), e.g. the unique playerId index.
  await Promise.all([Player.syncIndexes(), Score.syncIndexes()]);
  const server = createApp().listen(env.PORT, () => {
    console.log(`Robot Survival API listening on http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
