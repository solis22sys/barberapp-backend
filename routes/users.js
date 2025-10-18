const express = require('express');
const { 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  promoteToBarber,
  updateUserRole  
} = require('../controllers/userController');
const { userValidation } = require('../middleware/validation');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, adminAuth, getUsers);
router.get('/:id', auth, getUserById);
router.put('/:id', auth, userValidation, updateUser);
router.delete('/:id', auth, deleteUser);
router.post('/:id/promote-to-barber', auth, adminAuth, promoteToBarber);
router.patch('/:id/role', auth, adminAuth, updateUserRole);

module.exports = router;