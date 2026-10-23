const crypto = require('crypto');
const mongoose = require('mongoose');

const DISPLAY_NAME = /^[A-Za-z0-9_]{3,16}$/;
// Public player ID shown in the game, e.g. "RS-7K3M9Q" (no 0/O/1/I to avoid confusion).
const PLAYER_ID = /^RS-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
const ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function newPlayerId() {
  const bytes = crypto.randomBytes(6);
  let id = 'RS-';
  for (const b of bytes) id += ID_ALPHABET[b % ID_ALPHABET.length];
  return id;
}

const playerSchema = new mongoose.Schema(
  {
    playerId: { type: String, unique: true, sparse: true, match: PLAYER_ID },
    deviceId: { type: String, required: true, unique: true, match: /^[0-9a-f-]{36}$/i },
    displayName: { type: String, required: true, match: DISPLAY_NAME },
    bestScore: { type: Number, default: 0, min: 0 },
    bestSurvivalSeconds: { type: Number, default: 0, min: 0 },
    bestWave: { type: Number, default: 1, min: 1 },
    totalRuns: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

playerSchema.index({ bestScore: -1, updatedAt: 1 });

playerSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    playerId: this.playerId,
    displayName: this.displayName,
    bestScore: this.bestScore,
    bestSurvivalSeconds: this.bestSurvivalSeconds,
    bestWave: this.bestWave,
    totalRuns: this.totalRuns,
  };
};

/** Gives a player a public ID if it has none (new players and players created before IDs existed). */
playerSchema.methods.ensurePlayerId = async function ensurePlayerId() {
  for (let attempt = 0; !this.playerId && attempt < 5; attempt++) {
    const candidate = newPlayerId();
    const taken = await this.constructor.exists({ playerId: candidate });
    if (!taken) {
      this.playerId = candidate;
      await this.save();
    }
  }
  return this;
};

module.exports = { Player: mongoose.model('Player', playerSchema), DISPLAY_NAME, PLAYER_ID };
