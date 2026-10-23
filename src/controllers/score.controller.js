const { Player } = require('../models/Player');
const { Score } = require('../models/Score');
const { validateScore } = require('../utils/validateScore');

async function submitScore(req, res) {
  const error = validateScore(req.body);
  if (error) return res.status(422).json({ error });

  const { score, survivalSeconds, wave, enemiesKilled, gameVersion, platform } = req.body;
  const player = await Player.findByIdAndUpdate(
    req.playerId,
    {
      $max: { bestScore: score, bestSurvivalSeconds: survivalSeconds, bestWave: wave },
      $inc: { totalRuns: 1 },
    },
    { new: true }
  );
  if (!player) return res.status(401).json({ error: 'Player not found; register again' });

  await Score.create({
    playerId: player._id,
    score,
    survivalSeconds,
    wave,
    enemiesKilled,
    gameVersion: typeof gameVersion === 'string' ? gameVersion.slice(0, 20) : undefined,
    platform: typeof platform === 'string' ? platform.slice(0, 20) : undefined,
  });
  return res.status(201).json({ accepted: true, bestScore: player.bestScore });
}

/** Monday 00:00 UTC of the current week. */
function startOfWeekUTC(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d;
}

// GET /leaderboard?limit=50&period=all|week
async function leaderboard(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  if (req.query.period === 'week') {
    const since = startOfWeekUTC();
    const players = await Score.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$playerId', bestScore: { $max: '$score' }, bestWave: { $max: '$wave' } } },
      { $sort: { bestScore: -1, _id: 1 } },
      { $limit: limit },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      { $project: { _id: 0, playerId: '$player.playerId', displayName: '$player.displayName', bestScore: 1, bestWave: 1 } },
    ]);
    return res.json({ period: 'week', since, players });
  }
  const players = await Player.find({ bestScore: { $gt: 0 } })
    .sort({ bestScore: -1, updatedAt: 1 })
    .limit(limit)
    .select('playerId displayName bestScore bestWave bestSurvivalSeconds -_id')
    .lean();
  return res.json({ period: 'all', players });
}

module.exports = { submitScore, leaderboard, startOfWeekUTC };
