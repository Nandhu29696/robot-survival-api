const { Router } = require('express');
const { Player } = require('../models/Player');
const { Score } = require('../models/Score');
const { startOfWeekUTC } = require('../controllers/score.controller');
const { asyncHandler } = require('../utils/asyncHandler');

// Public, shareable leaderboard page: GET /  (add ?period=week for this week).
const router = Router();

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function topPlayers(period) {
  if (period === 'week') {
    return Score.aggregate([
      { $match: { createdAt: { $gte: startOfWeekUTC() } } },
      { $group: { _id: '$playerId', bestScore: { $max: '$score' }, bestWave: { $max: '$wave' } } },
      { $sort: { bestScore: -1, _id: 1 } },
      { $limit: 50 },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      { $project: { _id: 0, playerId: '$player.playerId', displayName: '$player.displayName', bestScore: 1, bestWave: 1 } },
    ]);
  }
  return Player.find({ bestScore: { $gt: 0 } })
    .sort({ bestScore: -1, updatedAt: 1 })
    .limit(50)
    .select('playerId displayName bestScore bestWave -_id')
    .lean();
}

router.get('/', asyncHandler(async (req, res) => {
  const period = req.query.period === 'week' ? 'week' : 'all';
  const [players, totalPlayers] = await Promise.all([topPlayers(period), Player.countDocuments()]);
  const rows = players.map((p, i) => `
      <tr${i < 3 ? ` class="top top${i + 1}"` : ''}>
        <td class="rank">${i + 1}</td>
        <td><span class="name">${escapeHtml(p.displayName)}</span><span class="pid">${escapeHtml(p.playerId || '')}</span></td>
        <td class="score">${Number(p.bestScore).toLocaleString('en-IN')}</td>
        <td class="wave">Wave ${Number(p.bestWave) || 1}</td>
      </tr>`).join('');
  res.set('Cache-Control', 'public, max-age=30');
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Robot Survival — Leaderboard</title>
<meta name="description" content="Global leaderboard for Robot Survival, a cartoon robot survival shooter for Android.">
<style>
  :root { --bg:#0F1B2D; --panel:#1B2B44; --floor:#16263D; --text:#F2F6FC; --muted:#A9B8CF; --accent:#FFB020; --cyan:#3EC6E0; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 16px 48px; }
  h1 { margin:0; font-size: clamp(32px, 7vw, 52px); letter-spacing: 1px; }
  h1 span { color: var(--accent); }
  .sub { color: var(--muted); margin: 8px 0 24px; }
  .tabs { display:flex; gap:10px; margin-bottom:16px; flex-wrap: wrap; }
  .tabs a { padding:10px 18px; border-radius:12px; text-decoration:none; font-weight:700; color:var(--text); background:var(--panel); border:2px solid #2C4266; }
  .tabs a.on { background:var(--accent); color:#1A1300; border-color:#8A5A00; }
  table { width:100%; border-collapse: separate; border-spacing: 0 6px; }
  td { padding: 12px 14px; background: var(--floor); }
  td:first-child { border-radius: 12px 0 0 12px; } td:last-child { border-radius: 0 12px 12px 0; }
  .rank { width: 56px; font-weight: 800; color: var(--muted); font-size: 18px; }
  .top1 .rank { color: var(--accent); } .top2 .rank { color: #C9D5E6; } .top3 .rank { color: #E08A4E; }
  .name { font-weight: 700; display:block; } .pid { color: var(--muted); font-size: 12px; }
  .score { color: var(--accent); font-weight: 800; text-align: right; font-size: 18px; }
  .wave { color: #C9D5E6; text-align: right; white-space: nowrap; width: 90px; }
  .empty { color: var(--muted); padding: 24px 0; }
  footer { color: var(--muted); font-size: 13px; margin-top: 24px; }
</style>
</head>
<body>
<main>
  <h1>ROBOT <span>SURVIVAL</span></h1>
  <p class="sub">Global leaderboard · ${totalPlayers.toLocaleString('en-IN')} players</p>
  <nav class="tabs">
    <a href="./" class="${period === 'all' ? 'on' : ''}">All-time</a>
    <a href="./?period=week" class="${period === 'week' ? 'on' : ''}">This week</a>
  </nav>
  ${players.length ? `<table>${rows}</table>` : '<p class="empty">No scores yet — be the first!</p>'}
  <footer>${period === 'week' ? 'Weekly board resets every Monday 00:00 UTC. ' : ''}Updates live as players finish runs.</footer>
</main>
</body>
</html>`);
}));

module.exports = router;
