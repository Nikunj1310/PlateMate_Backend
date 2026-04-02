'use strict';

const router = require('express').Router();
const { getReputation, getLeaderboard } = require('../controllers/reputationController');

router.get('/leaderboard', getLeaderboard);
router.get('/:userId', getReputation);

module.exports = router;
