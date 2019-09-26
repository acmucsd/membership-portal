const express = require('express');
const { User } = require('../../../db');

const router = express.Router();

/**
 * Gets the leaderboard as an ordered list of public user profiles, sorted by descending number of points. Supports
 * pagination using 'offset' and 'limit' query parameters.
 */
router.route('/')
  .get((req, res, next) => {
    const offset = parseInt(req.query.offset, 10);
    const limit = parseInt(req.query.limit, 10);

    User.getLeaderboard(offset, limit).then((users) => {
      res.json({ error: null, leaderboard: users.map((u) => u.getUserProfile()) });
    }).catch(next);
  });

module.exports = { router };
