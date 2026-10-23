const { Router } = require('express');
const { register, getMe, updateMe } = require('../controllers/player.controller');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.post('/players/register', asyncHandler(register));
router.get('/players/me', requireAuth, asyncHandler(getMe));
router.patch('/players/me', requireAuth, asyncHandler(updateMe));

module.exports = router;
