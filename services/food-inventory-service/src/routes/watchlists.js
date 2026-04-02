'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { getWatchlists, createWatchlist, deleteWatchlist } = require('../controllers/watchlistController');

router.get('/', verifyToken, getWatchlists);
router.post('/', verifyToken, createWatchlist);
router.delete('/:id', verifyToken, deleteWatchlist);

module.exports = router;
