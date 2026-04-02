'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { createReport } = require('../controllers/reportController');

router.post('/', verifyToken, createReport);

module.exports = router;
