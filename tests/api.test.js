// API tests against MongoDB Atlas using a throwaway database (robot_survival_test), dropped afterwards.
// Run: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const { createApp } = require('../src/app');

let server;
let base;

before(async () => {
  await connectDB('robot_survival_test');
  await mongoose.connection.syncIndexes();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  server.close();
});

async function call(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const deviceId = crypto.randomUUID();
let token;

test('health reports the database as connected', async () => {
  const r = await call('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.db, 'connected');
});

test('register returns a token; same deviceId returns the same player', async () => {
  const a = await call('POST', '/players/register', { deviceId, displayName: 'Tester_1' });
  assert.equal(a.status, 200);
  assert.ok(a.body.token);
  assert.match(a.body.player.playerId, /^RS-[23456789A-HJ-NP-Z]{6}$/);
  const b = await call('POST', '/players/register', { deviceId, displayName: 'Other' });
  assert.equal(b.body.player.id, a.body.player.id);
  assert.equal(b.body.player.playerId, a.body.player.playerId, 'player ID is stable for a device');
  assert.equal(b.body.player.displayName, 'Tester_1');
  token = a.body.token;
});

test('register rejects a bad deviceId', async () => {
  const r = await call('POST', '/players/register', { deviceId: 'nope' });
  assert.equal(r.status, 400);
});

test('valid score is accepted and bestScore never decreases', async () => {
  const good = { score: 400, survivalSeconds: 95, wave: 4, enemiesKilled: 20, gameVersion: '0.1.0', platform: 'android' };
  let r = await call('POST', '/scores', good, token);
  assert.equal(r.status, 201);
  assert.equal(r.body.bestScore, 400);
  assert.equal(r.body.rank, 1, 'upload returns the global rank');
  r = await call('POST', '/scores', { ...good, score: 100, enemiesKilled: 5 }, token);
  assert.equal(r.status, 201);
  assert.equal(r.body.bestScore, 400);
});

test('impossible scores are rejected', async () => {
  const cases = [
    { score: 99999, survivalSeconds: 10, wave: 1, enemiesKilled: 0 }, // too high for time
    { score: 100, survivalSeconds: 10, wave: 5, enemiesKilled: 0 }, // wave too high for time
    { score: 50, survivalSeconds: 40, wave: 2, enemiesKilled: 30 }, // kills don't match score
    { score: -1, survivalSeconds: 10, wave: 1, enemiesKilled: 0 },
    { score: 10.5, survivalSeconds: 10, wave: 1, enemiesKilled: 0 },
  ];
  for (const c of cases) {
    const r = await call('POST', '/scores', c, token);
    assert.equal(r.status, 422, JSON.stringify(c));
  }
});

test('scores require a valid token', async () => {
  const r = await call('POST', '/scores', { score: 1, survivalSeconds: 1, wave: 1, enemiesKilled: 0 }, 'bad.token');
  assert.equal(r.status, 401);
});

test('display name can be changed and is validated', async () => {
  let r = await call('PATCH', '/players/me', { displayName: 'Robo_Hunter' }, token);
  assert.equal(r.status, 200);
  assert.equal(r.body.player.displayName, 'Robo_Hunter');
  r = await call('PATCH', '/players/me', { displayName: 'x' }, token);
  assert.equal(r.status, 400);
});

test('leaderboard is sorted and /players/me returns rank', async () => {
  const other = await call('POST', '/players/register', { deviceId: crypto.randomUUID(), displayName: 'Top_Gun' });
  await call('POST', '/scores', { score: 900, survivalSeconds: 200, wave: 7, enemiesKilled: 50 }, other.body.token);
  const lb = await call('GET', '/leaderboard?limit=10');
  assert.equal(lb.status, 200);
  assert.deepEqual(lb.body.players.map((p) => p.bestScore), [900, 400]);
  assert.equal(lb.body.players[0].displayName, 'Top_Gun');
  assert.ok(lb.body.players.every((p) => /^RS-/.test(p.playerId)), 'leaderboard rows carry player IDs');
  const me = await call('GET', '/players/me', undefined, token);
  assert.equal(me.body.rank, 2);
});

test('weekly leaderboard ranks this week\'s best runs', async () => {
  const lb = await call('GET', '/leaderboard?limit=10&period=week');
  assert.equal(lb.status, 200);
  assert.equal(lb.body.period, 'week');
  assert.deepEqual(lb.body.players.map((p) => p.bestScore), [900, 400]);
  assert.equal(lb.body.players[1].displayName, 'Robo_Hunter');
});

test('public web leaderboard page lists players and escapes names', async () => {
  const res = await fetch(base.replace('/api/v1', '/'));
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.ok(html.includes('Top_Gun') && html.includes('Robo_Hunter'));
  assert.ok(!/<script/i.test(html), 'no scripts on the page');
  const week = await (await fetch(base.replace('/api/v1', '/?period=week'))).text();
  assert.ok(week.includes('This week'));
});

test('week starts on Monday 00:00 UTC', () => {
  const { startOfWeekUTC } = require('../src/controllers/score.controller');
  assert.equal(startOfWeekUTC(new Date('2026-10-22T15:00:00Z')).toISOString(), '2026-10-19T00:00:00.000Z'); // Thursday
  assert.equal(startOfWeekUTC(new Date('2026-10-19T00:30:00Z')).toISOString(), '2026-10-19T00:00:00.000Z'); // Monday
  assert.equal(startOfWeekUTC(new Date('2026-10-25T23:59:00Z')).toISOString(), '2026-10-19T00:00:00.000Z'); // Sunday
});

test('score submissions are rate limited per player', async () => {
  const p = await call('POST', '/players/register', { deviceId: crypto.randomUUID() });
  const run = { score: 10, survivalSeconds: 10, wave: 1, enemiesKilled: 0 };
  let last;
  for (let i = 0; i < 11; i++) last = await call('POST', '/scores', run, p.body.token);
  assert.equal(last.status, 429);
});
