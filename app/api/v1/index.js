const express = require('express');
const { authenticated } = require('./auth');

const router = express.Router();

// private API, requires authentication
router.use('/attendance', authenticated, require('./attendance').router);
router.use('/event', authenticated, require('./event').router);
router.use('/leaderboard', authenticated, require('./leaderboard').router);

// public API
router.use('/auth', require('./auth').router);

module.exports = { router };
