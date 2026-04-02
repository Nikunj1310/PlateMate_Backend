'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { getUserById, updateUser } = require('../controllers/userController');

router.get('/:id', verifyToken, getUserById);
router.put('/:id', verifyToken, updateUser);

module.exports = router;
