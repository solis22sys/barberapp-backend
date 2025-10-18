const express = require('express');
const { 
  getBarberStats, 
  getAdminStats, 
  getClientStats,
  getBarberDetailedStats
} = require('../controllers/statsController');
const { auth, adminAuth, barberAuth } = require('../middleware/auth');

const router = express.Router();


router.get('/barber', auth, barberAuth, getBarberStats);
router.get('/admin', auth, adminAuth, getAdminStats);
router.get('/client', auth, getClientStats);


router.get('/barber/:id/detailed', getBarberDetailedStats);

module.exports = router;