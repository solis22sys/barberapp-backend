const Barber = require('../models/Barber');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { validationResult } = require('express-validator');

// Obtener todos los barberos
exports.getBarbers = async (req, res) => {
  try {
    const barbers = await Barber.find({ available: true })
      .populate('user', 'name email phone avatar')
      .select('-__v');

    const barbersWithStats = await Promise.all(
      barbers.map(async (barber) => {
        const completedAppointments = await Appointment.countDocuments({
          barber: barber._id,
          status: 'completed'
        });
        
        return {
          ...barber.toObject(),
          completedAppointments
        };
      })
    );
    
    res.json(barbersWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Obtener barbero por ID
exports.getBarberById = async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.id)
      .populate('user', 'name email phone avatar')
      .select('-__v');
    
    if (!barber) {
      return res.status(404).json({ message: 'Barbero no encontrado' });
    }
    
    res.json(barber);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Barbero no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Obtener perfil del barbero
exports.getMyBarberProfile = async (req, res) => {
  try {
    const barber = await Barber.findOne({ user: req.user.id })
      .populate('user', 'name email phone avatar')
      .select('-__v');
    
    if (!barber) {
      return res.status(404).json({ message: 'Perfil de barbero no encontrado' });
    }
    
    res.json(barber);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Crear perfil de barbero
exports.createBarber = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { specialty, description, workingHours } = req.body;
    
    const existingBarber = await Barber.findOne({ user: req.user.id });
    if (existingBarber) {
      return res.status(400).json({ message: 'El usuario ya tiene un perfil de barbero' });
    }
    
    const barber = new Barber({
      user: req.user.id,
      specialty,
      description,
      workingHours
    });
    
    const savedBarber = await barber.save();
    const populatedBarber = await Barber.findById(savedBarber._id)
      .populate('user', 'name email phone avatar');
    
    await User.findByIdAndUpdate(req.user.id, { role: 'barber' });
    
    res.status(201).json(populatedBarber);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Actualizar perfil de barbero
exports.updateBarber = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { specialty, description, workingHours, available } = req.body;
    let barber = await Barber.findById(req.params.id);
    
    if (!barber) {
      return res.status(404).json({ message: 'Barbero no encontrado' });
    }
    
    if (barber.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }
    
    if (specialty) barber.specialty = specialty;
    if (description !== undefined) barber.description = description;
    if (workingHours) barber.workingHours = workingHours;
    if (available !== undefined) barber.available = available;
    
    const updatedBarber = await barber.save();
    const populatedBarber = await Barber.findById(updatedBarber._id)
      .populate('user', 'name email phone avatar');
    
    res.json(populatedBarber);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Barbero no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Actualizar perfil del barbero
exports.updateBarberProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { specialty, description, experience } = req.body;
    
    let barber = await Barber.findOne({ user: req.user.id });
    
    if (!barber) {
      return res.status(404).json({ message: 'Perfil de barbero no encontrado' });
    }
    
    if (specialty) barber.specialty = specialty;
    if (description !== undefined) barber.description = description;
    if (experience !== undefined) barber.experience = experience;
    
    const updatedBarber = await barber.save();
    const populatedBarber = await Barber.findById(updatedBarber._id)
      .populate('user', 'name email phone avatar');
    
    res.json(populatedBarber);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Eliminar barbero
exports.deleteBarber = async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.id);
    
    if (!barber) {
      return res.status(404).json({ message: 'Barbero no encontrado' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }
    
    await User.findByIdAndUpdate(barber.user, { role: 'client' });
    await Appointment.deleteMany({ barber: barber._id });
    await Barber.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Barbero eliminado' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Barbero no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Obtener horarios disponibles
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;
    const barber = await Barber.findById(req.params.id);
    
    if (!barber) {
      return res.status(404).json({ message: 'Barbero no encontrado' });
    }
    
    if (!date) {
      return res.status(400).json({ message: 'La fecha es requerida' });
    }
    
    const appointments = await Appointment.find({
      barber: barber._id,
      date: new Date(date),
      status: { $in: ['pending', 'confirmed'] }
    });
    
    const [startHour, startMinute] = barber.workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = barber.workingHours.end.split(':').map(Number);
    
    const availableSlots = [];
    const slotDuration = 30;
    
    let currentTime = new Date();
    currentTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0, 0);
    
    while (currentTime < endTime) {
      const slotStart = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
      
      currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
      const slotEnd = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
      
      const isOccupied = appointments.some(apt => {
        return apt.startTime < slotEnd && apt.endTime > slotStart;
      });
      
      if (!isOccupied) {
        availableSlots.push(slotStart);
      }
    }
    
    res.json(availableSlots);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Barbero no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};