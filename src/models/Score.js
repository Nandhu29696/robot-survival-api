const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    score: { type: Number, required: true, min: 0 },
    survivalSeconds: { type: Number, required: true, min: 0 },
    wave: { type: Number, required: true, min: 1 },
    enemiesKilled: { type: Number, required: true, min: 0 },
    gameVersion: { type: String, maxlength: 20 },
    platform: { type: String, maxlength: 20 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

scoreSchema.index({ playerId: 1, createdAt: -1 });
// Keep the free 512 MB tier from filling up: run history expires after 90 days.
scoreSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = { Score: mongoose.model('Score', scoreSchema) };
