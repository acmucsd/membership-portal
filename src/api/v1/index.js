const express = require('express');
const { authenticated } = require('./auth');

const router = express.Router();

// private API, requires authentication
router.use('/admin', authenticated, require('./admin').router);
router.use('/attendance', authenticated, require('./attendance').router);
router.use('/leaderboard', authenticated, require('./leaderboard').router);
router.use('/user', authenticated, require('./user').router);
router.use('/store', authenticated, require('./store').router);

// public API
router.use('/auth', require('./auth').router);
router.use('/event', require('./event').router);

module.exports = { router };
