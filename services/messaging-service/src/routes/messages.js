'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { getMessages, sendMessage, markMessagesRead } = require('../controllers/messageController');

router.get('/:postId', verifyToken, getMessages);
router.post('/', verifyToken, sendMessage);
router.put('/:postId/read', verifyToken, markMessagesRead);

module.exports = router;
