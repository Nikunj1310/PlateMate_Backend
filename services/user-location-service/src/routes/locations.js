'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { getLocations, addLocation, activateLocation, deleteLocation, updateLocation } = require('../controllers/locationController');

router.get('/', verifyToken, getLocations);
router.post('/', verifyToken, addLocation);
router.put('/:id', verifyToken, updateLocation);
router.put('/:id/activate', verifyToken, activateLocation);
router.delete('/:id', verifyToken, deleteLocation);

module.exports = router;
