const { body } = require('express-validator');

// Validaciones para usuarios
exports.userValidation = [
  body('name', 'El nombre es requerido').not().isEmpty(),
  body('email', 'Por favor incluye un email válido').isEmail(),
  body('phone', 'El teléfono es requerido').not().isEmpty()
];

// Validación para cambio de rol
exports.roleValidation = [
  body('role', 'El rol es requerido').not().isEmpty(),
  body('role', 'El rol debe ser client, barber o admin').isIn(['client', 'barber', 'admin'])
];

// Validaciones para citas
exports.appointmentValidation = [
  body('barber', 'El barbero es requerido').not().isEmpty(),
  body('service', 'El servicio es requerido').not().isEmpty(),
  body('date', 'La fecha es requerida').not().isEmpty(),
  body('startTime', 'La hora de inicio es requerida').not().isEmpty()
];

// Validaciones para calificaciones
exports.ratingValidation = [
  body('rating', 'La calificación es requerida (1-5)').isInt({ min: 1, max: 5 })
];

// Validaciones para barberos
exports.barberValidation = [
  body('specialty', 'La especialidad es requerida').not().isEmpty()
];

// Validaciones para servicios
exports.serviceValidation = [
  body('name', 'El nombre del servicio es requerido').not().isEmpty(),
  body('duration', 'La duración es requerida (en minutos)').isInt({ min: 1 }),
  body('price', 'El precio es requerido').isFloat({ min: 0 })
];