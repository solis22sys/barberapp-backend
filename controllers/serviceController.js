const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const { validationResult } = require('express-validator');

// Obtener todos los servicios
exports.getServices = async (req, res) => {
  try {
    // Deshabilitar caché para esta respuesta
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // Aplicar filtro según el rol
    const filter = req.user?.role === 'admin' ? {} : { available: true };
    const services = await Service.find(filter);
    
    res.json(services);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Obtener servicio por ID
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    
    res.json(service);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    console.error('Error al obtener servicio:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Crear servicio (admin)
exports.createService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, duration, price, available } = req.body;
    
    const service = new Service({
      name,
      description,
      duration,
      price,
      available: available !== undefined ? available : true
    });
    
    const savedService = await service.save();
    res.status(201).json(savedService);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'El servicio ya existe' });
    }
    console.error('Error al crear servicio:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Actualizar servicio (admin)
exports.updateService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, duration, price, available } = req.body;
    let service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    
    if (name) service.name = name;
    if (description !== undefined) service.description = description;
    if (duration) service.duration = duration;
    if (price) service.price = price;
    if (available !== undefined) service.available = available;
    
    const updatedService = await service.save();
    res.json(updatedService);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'El servicio ya existe' });
    }
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Eliminar servicio (admin)
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    
    // Verificar si hay citas asociadas
    const appointments = await Appointment.find({ service: service._id });
    if (appointments.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el servicio porque tiene citas asociadas' 
      });
    }
    
    await Service.findByIdAndDelete(req.params.id);
    res.json({ message: 'Servicio eliminado' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};