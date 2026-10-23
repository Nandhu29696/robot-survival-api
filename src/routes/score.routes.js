const { Router } = require('express');
const { submitScore, leaderboard } = require('../controllers/score.controller');
const { requireAuth } = require('../middleware/auth');
const { scoreLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.post('/scores', requireAuth, scoreLimiter, asyncHandler(submitScore));
router.get('/leaderboard', asyncHandler(leaderboard));

module.exports = router;
