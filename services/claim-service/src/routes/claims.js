'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { getClaims, createClaim, getClaim, approveClaim, rejectClaim, getClaimsForPost } = require('../controllers/claimController');

router.get('/', verifyToken, getClaims);
router.post('/', verifyToken, createClaim);
router.get('/post/:postId', verifyToken, getClaimsForPost);
router.get('/:id', verifyToken, getClaim);
router.put('/:id/approve', verifyToken, approveClaim);
router.put('/:id/reject', verifyToken, rejectClaim);

module.exports = router;
