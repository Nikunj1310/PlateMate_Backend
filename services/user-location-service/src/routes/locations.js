'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { getLocations, addLocation, activateLocation, deleteLocation } = require('../controllers/locationController');

router.get('/', verifyToken, getLocations);
router.post('/', verifyToken, addLocation);
router.put('/:id/activate', verifyToken, activateLocation);
router.delete('/:id', verifyToken, deleteLocation);

module.exports = router;
