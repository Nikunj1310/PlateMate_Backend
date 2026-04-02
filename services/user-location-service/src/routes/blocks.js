'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { blockUser, unblockUser } = require('../controllers/blockController');

router.post('/', verifyToken, blockUser);
router.delete('/:blockedId', verifyToken, unblockUser);

module.exports = router;
