const { env } = require('../config/env');

// Scoring rules mirror client/scripts/autoload/config.gd (plan Section 11.2):
// +1 per second survived, +10..40 per kill (boss 300) × combo up to x4, +50 per new wave, new wave every 30 s.
// Every kill is worth at least 10 points, so enemiesKilled * 10 <= score always holds.
const SCORE_PER_KILL = 10;

function isInt(v) {
  return Number.isInteger(v) && v >= 0;
}

/** Returns an error message, or null when the run looks plausible. */
function validateScore(run) {
  if (!run || typeof run !== 'object') return 'Body must be a JSON object';
  const { score, survivalSeconds, wave, enemiesKilled } = run;
  if (![score, survivalSeconds, wave, enemiesKilled].every(isInt)) {
    return 'score, survivalSeconds, wave and enemiesKilled must be non-negative integers';
  }
  if (wave < 1) return 'wave must be at least 1';
  if (survivalSeconds > env.MAX_RUN_SECONDS) return 'survivalSeconds exceeds the maximum run length';
  if (score > Math.max(survivalSeconds, 1) * env.MAX_SCORE_PER_SECOND) return 'score is too high for the run length';
  if (wave > Math.floor(survivalSeconds / env.WAVE_SECONDS) + 1) return 'wave is too high for the run length';
  if (enemiesKilled * SCORE_PER_KILL > score) return 'enemiesKilled does not match the score';
  return null;
}

module.exports = { validateScore };
