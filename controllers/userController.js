const User = require('../models/User');
const Barber = require('../models/Barber');
const Appointment = require('../models/Appointment');
const { validationResult } = require('express-validator');

// Obtener todos los usuarios (solo admin)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Obtener usuario por ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Solo el mismo usuario o un admin puede actualizar
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.avatar = avatar || user.avatar;

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Actualizar rol de usuario (solo admin)
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    
    const validRoles = ['client', 'barber', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'No puedes cambiar tu propio rol' });
    }
    
    const oldRole = user.role;
    

    if (role === 'barber' && oldRole !== 'barber') {
      const existingBarber = await Barber.findOne({ user: userId });
      if (!existingBarber) {

        const barber = new Barber({
          user: userId,
          specialty: 'Cortes de cabello',
          description: 'Nuevo barbero'
        });
        await barber.save();
      }
    }
    

    if (oldRole === 'barber' && role !== 'barber') {

      const barber = await Barber.findOne({ user: userId });
      if (barber) {

        await Appointment.updateMany(
          { 
            barber: barber._id, 
            status: { $in: ['pending', 'confirmed'] } 
          },
          { status: 'cancelled' }
        );
        
        await Barber.findByIdAndDelete(barber._id);
      }
    }
    

    user.role = role;
    await user.save();
    
    res.json({
      message: `Rol del usuario actualizado a ${role}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }


    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }


    if (user.role === 'barber') {
      await Barber.findOneAndDelete({ user: user._id });
    }


    await Appointment.deleteMany({ client: user._id });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};


exports.promoteToBarber = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    if (user.role === 'barber') {
      return res.status(400).json({ message: 'El usuario ya es barbero' });
    }
    
    user.role = 'barber';
    await user.save();
    

    const barber = new Barber({
      user: user._id,
      specialty: 'Cortes de cabello',
      description: 'Nuevo barbero'
    });
    
    await barber.save();
    
    res.json({ message: 'Usuario promovido a barbero', user });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};