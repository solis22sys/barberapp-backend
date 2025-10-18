const Appointment = require('../models/Appointment');
const Barber = require('../models/Barber');
const Service = require('../models/Service');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { sendEmail, emailTemplates } = require('../utils/emailService');


const populateAppointment = () => ({
  path: 'barber',
  populate: {
    path: 'user',
    select: 'name email phone'
  }
});

// Crear una nueva cita
exports.createAppointment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { barber, service, date, startTime, notes } = req.body;
    
    
    const barberExists = await Barber.findById(barber).populate('user', 'name');
    if (!barberExists) {
      return res.status(404).json({ message: 'Barbero no encontrado' });
    }
    
    
    const serviceExists = await Service.findById(service);
    if (!serviceExists) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    
    
    const duration = serviceExists.duration;
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date(date);
    startDate.setHours(hours, minutes);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    
    // Verificar disponibilidad
    const existingAppointment = await Appointment.findOne({
      barber,
      date,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          $and: [
            { startTime: { $lte: startTime } },
            { endTime: { $gt: startTime } }
          ]
        },
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gte: endTime } }
          ]
        },
        {
          $and: [
            { startTime: { $gte: startTime } },
            { endTime: { $lte: endTime } }
          ]
        }
      ]
    });
    
    if (existingAppointment) {
      return res.status(400).json({ message: 'El barbero no está disponible en ese horario' });
    }
    
    // Crear la cita
    const appointment = new Appointment({
      client: req.user.id,
      barber,
      service,
      date,
      startTime,
      endTime,
      notes
    });
    
    const savedAppointment = await appointment.save();
    
    
    const populatedAppointment = await Appointment.findById(savedAppointment._id)
      .populate('client', 'name email phone')
      .populate(populateAppointment())
      .populate('service');
    
    // Enviar email de confirmación
    try {
      const template = emailTemplates.appointmentConfirmation(
        req.user.name,
        new Date(date).toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        startTime,
        barberExists.user.name,
        serviceExists.name
      );
      
      await sendEmail(
        req.user.email,
        template.subject,
        template.text,
        template.html
      );
    } catch (emailError) {
      console.error('Error enviando email (pero la cita se creó):', emailError.message);
    }
    
    res.status(201).json(populatedAppointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Obtener todas las citas del usuario
exports.getUserAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ client: req.user.id })
      .populate(populateAppointment())
      .populate('service')
      .sort({ date: -1, startTime: -1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Obtener citas de un barbero
exports.getBarberAppointments = async (req, res) => {
  try {
    const barber = await Barber.findOne({ user: req.user.id });
    
    if (!barber) {
      return res.status(404).json({ message: 'Perfil de barbero no encontrado' });
    }
    
    const appointments = await Appointment.find({ barber: barber._id })
      .populate('client', 'name email phone')
      .populate('service')
      .sort({ date: -1, startTime: -1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Obtener todas las citas (admin)
exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('client', 'name email phone')
      .populate(populateAppointment())
      .populate('service')
      .sort({ date: -1, startTime: -1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Obtener cita por ID
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('client', 'name email phone')
      .populate(populateAppointment())
      .populate('service');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }
    
    
    const isClient = appointment.client._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isBarber = appointment.barber.user && appointment.barber.user._id.toString() === req.user.id;
    
    if (!isClient && !isAdmin && !isBarber) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    
    res.json(appointment);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Actualizar cita
exports.updateAppointment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { barber, service, date, startTime, status, notes } = req.body;
    let appointment = await Appointment.findById(req.params.id)
      .populate(populateAppointment());
    
    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }
    
    
    const isClient = appointment.client.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isBarber = appointment.barber.user && appointment.barber.user._id.toString() === req.user.id;
    
    if (!isClient && !isAdmin && !isBarber) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    
    
    if (status && !barber && !service && !date && !startTime) {
      appointment.status = status;
      const updatedAppointment = await appointment.save();
      const populatedAppointment = await Appointment.findById(updatedAppointment._id)
        .populate('client', 'name email phone')
        .populate(populateAppointment())
        .populate('service');
      
      return res.json(populatedAppointment);
    }
    
    // Si se cambia el servicio, barbero o horario, verificar disponibilidad
    if ((barber && barber !== appointment.barber._id.toString()) || 
        (service && service !== appointment.service.toString()) ||
        (date && date !== appointment.date.toISOString().split('T')[0]) ||
        (startTime && startTime !== appointment.startTime)) {
      
      const targetBarber = barber || appointment.barber._id;
      const targetService = service || appointment.service;
      const targetDate = date || appointment.date.toISOString().split('T')[0];
      const targetStartTime = startTime || appointment.startTime;
      
      // Obtener duración del servicio
      let serviceDuration;
      if (service) {
        const serviceData = await Service.findById(service);
        serviceDuration = serviceData.duration;
      } else {
        const serviceData = await Service.findById(appointment.service);
        serviceDuration = serviceData.duration;
      }
      
      // Calcular hora de fin
      const [hours, minutes] = targetStartTime.split(':').map(Number);
      const startDate = new Date(targetDate);
      startDate.setHours(hours, minutes);
      const endDate = new Date(startDate.getTime() + serviceDuration * 60000);
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      
      // Verificar disponibilidad
      const existingAppointment = await Appointment.findOne({
        barber: targetBarber,
        date: targetDate,
        _id: { $ne: req.params.id },
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          {
            $and: [
              { startTime: { $lte: targetStartTime } },
              { endTime: { $gt: targetStartTime } }
            ]
          },
          {
            $and: [
              { startTime: { $lt: endTime } },
              { endTime: { $gte: endTime } }
            ]
          },
          {
            $and: [
              { startTime: { $gte: targetStartTime } },
              { endTime: { $lte: endTime } }
            ]
          }
        ]
      });
      
      if (existingAppointment) {
        return res.status(400).json({ message: 'El barbero no está disponible en ese horario' });
      }
      
      if (service || startTime) {
        appointment.endTime = endTime;
      }
    }
    
    
    if (barber) appointment.barber = barber;
    if (service) appointment.service = service;
    if (date) appointment.date = date;
    if (startTime) appointment.startTime = startTime;
    if (status) appointment.status = status;
    if (notes !== undefined) appointment.notes = notes;
    
    const updatedAppointment = await appointment.save();
    const populatedAppointment = await Appointment.findById(updatedAppointment._id)
      .populate('client', 'name email phone')
      .populate(populateAppointment())
      .populate('service');
    
    res.json(populatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// Cancelar cita
exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate(populateAppointment());
    
    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }
    
    // Verificar permisos
    const isClient = appointment.client.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isBarber = appointment.barber.user && appointment.barber.user._id.toString() === req.user.id;
    
    if (!isClient && !isAdmin && !isBarber) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    
    appointment.status = 'cancelled';
    await appointment.save();
    
    res.json({ message: 'Cita cancelada' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Calificar cita
exports.rateAppointment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, review } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }
    
    if (appointment.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    
    if (appointment.status !== 'completed') {
      return res.status(400).json({ message: 'Solo se pueden calificar citas completadas' });
    }
    
    appointment.rating = rating;
    appointment.review = review || '';
    
    await appointment.save();
    
    // Actualizar rating del barbero
    const barberAppointments = await Appointment.find({ 
      barber: appointment.barber, 
      rating: { $exists: true, $ne: null } 
    });
    
    if (barberAppointments.length > 0) {
      const totalRating = barberAppointments.reduce((sum, apt) => sum + apt.rating, 0);
      const averageRating = totalRating / barberAppointments.length;
      
      await Barber.findByIdAndUpdate(appointment.barber, {
        rating: Math.round(averageRating * 10) / 10,
        ratingsCount: barberAppointments.length
      });
    }
    
    res.json({ message: 'Cita calificada' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Obtener citas por fecha
exports.getAppointmentsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'La fecha es requerida' });
    }
    
    let query = { date: new Date(date) };
    
    if (req.user.role === 'barber') {
      const barber = await Barber.findOne({ user: req.user.id });
      if (barber) {
        query.barber = barber._id;
      }
    } else if (req.user.role === 'client') {
      query.client = req.user.id;
    }
    
    const appointments = await Appointment.find(query)
      .populate('client', 'name phone')
      .populate(populateAppointment())
      .populate('service')
      .sort({ startTime: 1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};