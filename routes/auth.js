const express = require('express');
const { body } = require('express-validator');
const { 
  register, 
  login, 
  getProfile, 
  forgotPassword, 
  resetPassword,
  updateProfile,
  verifyResetToken,
  changePassword 
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validaciones
const registerValidation = [
  body('name', 'El nombre es requerido').not().isEmpty(),
  body('email', 'Por favor incluye un email válido').isEmail(),
  body('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  body('phone', 'El teléfono es requerido').not().isEmpty()
];

const loginValidation = [
  body('email', 'Por favor incluye un email válido').isEmail(),
  body('password', 'La contraseña es requerida').exists()
];

const forgotPasswordValidation = [
  body('email', 'Por favor incluye un email válido').isEmail()
];

const resetPasswordValidation = [
  body('token', 'El token es requerido').not().isEmpty(),
  body('newPassword', 'La nueva contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
];

const updateProfileValidation = [
  body('name', 'El nombre es requerido').optional().not().isEmpty(),
  body('email', 'Por favor incluye un email válido').optional().isEmail(),
  body('phone', 'El teléfono es requerido').optional().not().isEmpty()
];


const changePasswordValidation = [
  body('currentPassword', 'La contraseña actual es requerida').not().isEmpty(),
  body('newPassword', 'La nueva contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
];

// Rutas públicas
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);

// Rutas protegidas
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfileValidation, updateProfile);

router.put('/change-password', auth, changePasswordValidation, changePassword);

module.exports = router;