const mongoose = require('mongoose');

const barberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specialty: {
    type: String,
    required: true,
    default: 'Cortes de cabello'
  },
  description: {
    type: String,
    default: 'Barbero profesional dedicado a brindar el mejor servicio.'
  },
  experience: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  ratingsCount: {
    type: Number,
    default: 0
  },
  completedAppointments: {
    type: Number,
    default: 0
  },
  available: {
    type: Boolean,
    default: true
  },
  workingHours: {
    start: {
      type: String,
      default: '09:00'
    },
    end: {
      type: String,
      default: '18:00'
    }
  },
  //campos para estadísticas
  activeClients: {
    type: Number,
    default: 0
  },
  repeatClients: {
    type: Number,
    default: 0
  },
  satisfactionRate: {
    type: String,
    default: '100%'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Barber', barberSchema);