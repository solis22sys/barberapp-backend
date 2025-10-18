const express = require('express');
const { 
  getBarbers, 
  getBarberById, 
  createBarber, 
  updateBarber, 
  deleteBarber, 
  getAvailableSlots,
  updateBarberProfile,
  getMyBarberProfile 
} = require('../controllers/barberController');
const { barberValidation } = require('../middleware/validation');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', getBarbers);
router.get('/:id', getBarberById);
router.get('/:id/available-slots', getAvailableSlots);
router.get('/profile/me', auth, getMyBarberProfile);

router.post('/', auth, barberValidation, createBarber);
router.put('/:id', auth, barberValidation, updateBarber);
router.delete('/:id', auth, adminAuth, deleteBarber);

router.patch('/profile/me', auth, barberValidation, updateBarberProfile);

module.exports = router;