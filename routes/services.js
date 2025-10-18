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


router.get('/', getServices);
router.get('/:id', getServiceById);


router.post('/', auth, adminAuth, serviceValidation, createService);
router.put('/:id', auth, adminAuth, serviceValidation, updateService);
router.delete('/:id', auth, adminAuth, deleteService);

module.exports = router;