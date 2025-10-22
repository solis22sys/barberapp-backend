const express = require('express');
const { 
  getServices, 
  getServiceById, 
  createService, 
  updateService, 
  deleteService 
} = require('../controllers/serviceController');
const { serviceValidation } = require('../middleware/validation');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// IMPORTANTE: Cambiar esta ruta para que auth sea opcional
// pero permita detectar si es admin
router.get('/', async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    // Si hay token, ejecutar el middleware auth
    return auth(req, res, next);
  } else {
    // Si no hay token, continuar sin autenticación
    next();
  }
}, getServices);

router.get('/:id', getServiceById);

// Rutas protegidas (solo admin)
router.post('/', auth, adminAuth, serviceValidation, createService);
router.put('/:id', auth, adminAuth, serviceValidation, updateService);
router.delete('/:id', auth, adminAuth, deleteService);

module.exports = router;