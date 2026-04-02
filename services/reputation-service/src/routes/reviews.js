'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { submitReview, getReviewsForUser } = require('../controllers/reviewController');

router.post('/', verifyToken, submitReview);
router.get('/user/:userId', getReviewsForUser);

module.exports = router;
