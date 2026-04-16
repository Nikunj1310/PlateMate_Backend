'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const {
  register, login, refresh, logout, getMe, forgotPassword, resetPassword, oauthGoogle, oauthGithub
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/oauth/google', oauthGoogle);
router.post('/oauth/github', oauthGithub);

module.exports = router;
