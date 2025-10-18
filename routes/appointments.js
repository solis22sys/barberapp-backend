const express = require('express');
const { 
  createAppointment, 
  getUserAppointments, 
  getBarberAppointments, 
  getAllAppointments, 
  getAppointmentById, 
  updateAppointment, 
  cancelAppointment, 
  rateAppointment 
} = require('../controllers/appointmentController');
const { appointmentValidation, ratingValidation } = require('../middleware/validation');
const { auth, adminAuth, barberAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, appointmentValidation, createAppointment);
router.get('/my-appointments', auth, getUserAppointments);
router.get('/barber-appointments', auth, barberAuth, getBarberAppointments);
router.get('/', auth, adminAuth, getAllAppointments);
router.get('/:id', auth, getAppointmentById);
router.put('/:id', auth, updateAppointment);
router.patch('/:id/cancel', auth, cancelAppointment);
router.post('/:id/rate', auth, ratingValidation, rateAppointment);

module.exports = router;