const { Player, DISPLAY_NAME } = require('../models/Player');
const { signToken } = require('../middleware/auth');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function register(req, res) {
  const { deviceId, displayName } = req.body || {};
  if (typeof deviceId !== 'string' || !UUID.test(deviceId)) {
    return res.status(400).json({ error: 'deviceId must be a UUID' });
  }
  const name = typeof displayName === 'string' && DISPLAY_NAME.test(displayName)
    ? displayName
    : `Player${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

  const player = await Player.findOneAndUpdate(
    { deviceId },
    { $setOnInsert: { deviceId, displayName: name } },
    { new: true, upsert: true, runValidators: true }
  );
  await player.ensurePlayerId();
  return res.status(200).json({ token: signToken(player._id), player: player.toPublic() });
}

async function rankOf(player) {
  return (await Player.countDocuments({ bestScore: { $gt: player.bestScore } })) + 1;
}

async function getMe(req, res) {
  const player = await Player.findById(req.playerId);
  if (!player) return res.status(401).json({ error: 'Player not found; register again' });
  await player.ensurePlayerId();
  return res.json({ player: player.toPublic(), rank: await rankOf(player) });
}

async function updateMe(req, res) {
  const { displayName } = req.body || {};
  if (typeof displayName !== 'string' || !DISPLAY_NAME.test(displayName)) {
    return res.status(400).json({ error: 'displayName must be 3-16 letters, numbers or _' });
  }
  const player = await Player.findByIdAndUpdate(req.playerId, { displayName }, { new: true, runValidators: true });
  if (!player) return res.status(401).json({ error: 'Player not found; register again' });
  return res.json({ player: player.toPublic() });
}

module.exports = { register, getMe, updateMe };
