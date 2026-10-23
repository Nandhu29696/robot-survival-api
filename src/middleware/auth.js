const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

function signToken(playerId) {
  return jwt.sign({ sub: String(playerId) }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    req.playerId = jwt.verify(token, env.JWT_SECRET).sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { signToken, requireAuth };
