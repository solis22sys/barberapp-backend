const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Barber = require('../models/Barber');
const Service = require('../models/Service');

// Estadísticas para barberos
exports.getBarberStats = async (req, res) => {
  try {
    const barber = await Barber.findOne({ user: req.user.id });
    
    if (!barber) {
      return res.status(404).json({ message: 'Perfil de barbero no encontrado' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Citas de hoy
    const todayAppointments = await Appointment.countDocuments({
      barber: barber._id,
      date: { $gte: today, $lt: tomorrow }
    });
    
    // Citas de la semana
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    const weeklyAppointments = await Appointment.countDocuments({
      barber: barber._id,
      date: { $gte: startOfWeek, $lt: endOfWeek }
    });
    

    const completedAppointments = await Appointment.countDocuments({
      barber: barber._id,
      status: 'completed'
    });
    
    // Ingresos totales de citas completadas
    const completedAppointmentsList = await Appointment.find({
      barber: barber._id,
      status: 'completed'
    }).populate('service');
    
    const totalEarnings = completedAppointmentsList.reduce((sum, apt) => {
      return sum + (apt.service?.price || 0);
    }, 0);
    
    res.json({
      todayAppointments,
      rating: barber.rating || 0,
      ratingsCount: barber.ratingsCount || 0,
      weeklyAppointments,
      completedAppointments,
      totalEarnings: Math.round(totalEarnings * 100) / 100
    });
  } catch (error) {
    console.error('Error getting barber stats:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Estadísticas para administradores
exports.getAdminStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    
    const totalUsers = await User.countDocuments();
    

    const totalConfirmedAppointments = await Appointment.countDocuments({
      status: 'confirmed'
    });
    

    const totalCompletedAppointments = await Appointment.countDocuments({
      status: 'completed'
    });
    
    
    const allCompletedAppointments = await Appointment.find({
      status: 'completed'
    }).populate('service');
    
    const totalRevenue = allCompletedAppointments.reduce((sum, apt) => {
      return sum + (apt.service?.price || 0);
    }, 0);
    
    
    const todayAppointments = await Appointment.countDocuments({
      date: { $gte: today, $lt: tomorrow }
    });
    
    // Barbero con mejor rating
    const topBarber = await Barber.findOne({ rating: { $gt: 0 } })
      .sort({ rating: -1 })
      .limit(1)
      .populate('user', 'name');
    
    res.json({
      totalUsers,
      totalConfirmedAppointments,
      totalCompletedAppointments,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      todayAppointments,
      topBarber: topBarber ? {
        name: topBarber.user.name,
        rating: topBarber.rating
      } : null
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Estadísticas para clientes
exports.getClientStats = async (req, res) => {
  try {
    const appointments = await Appointment.find({ client: req.user.id });
    
    const upcomingAppointments = appointments.filter(a => 
      a.status !== 'cancelled' && a.status !== 'completed' &&
      new Date(a.date) >= new Date().setHours(0, 0, 0, 0)
    ).length;
    
    const completedAppointments = appointments.filter(a => 
      a.status === 'completed'
    ).length;
    
    const barbersVisited = new Set(appointments.map(a => a.barber.toString())).size;
    
    // Rating promedio si ha calificado
    const ratedAppointments = appointments.filter(a => a.rating);
    const averageRating = ratedAppointments.length > 0
      ? (ratedAppointments.reduce((sum, a) => sum + a.rating, 0) / ratedAppointments.length).toFixed(1)
      : 0;
    
    res.json({
      upcomingAppointments,
      completedAppointments,
      favoriteBarbers: barbersVisited,
      averageRating: parseFloat(averageRating)
    });
  } catch (error) {
    console.error('Error getting client stats:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Estadísticas detalladas para perfil de barbero
exports.getBarberDetailedStats = async (req, res) => {
  try {
    const barberId = req.params.id;
    
    const barber = await Barber.findById(barberId)
      .populate('user', 'name email phone avatar');
    
    if (!barber) {
      return res.status(404).json({ message: 'Barbero no encontrado' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Citas completadas totales
    const completedAppointments = await Appointment.countDocuments({
      barber: barberId,
      status: 'completed'
    });
    
    
    const uniqueClients = await Appointment.distinct('client', {
      barber: barberId,
      status: { $in: ['completed', 'confirmed'] }
    });
    
    // Clientes recurrentes (más de 1 cita completada)
    const clientAppointmentCounts = await Appointment.aggregate([
      {
        $match: {
          barber: barber._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$client',
          appointmentCount: { $sum: 1 }
        }
      },
      {
        $match: {
          appointmentCount: { $gt: 1 }
        }
      }
    ]);
    
    const repeatClients = clientAppointmentCounts.length;
    
    // Tasa de satisfacción 
    const ratedAppointments = await Appointment.find({
      barber: barberId,
      rating: { $exists: true, $gt: 0 }
    });
    
    let satisfactionRate = '100%';
    if (ratedAppointments.length > 0) {
      const averageRating = ratedAppointments.reduce((sum, apt) => sum + apt.rating, 0) / ratedAppointments.length;
      satisfactionRate = `${Math.round((averageRating / 5) * 100)}%`;
    }
    
    // Citas de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAppointments = await Appointment.countDocuments({
      barber: barberId,
      date: { $gte: thirtyDaysAgo },
      status: { $in: ['completed', 'confirmed'] }
    });
    
    res.json({
      completedAppointments,
      activeClients: uniqueClients.length,
      repeatClients,
      satisfactionRate,
      recentAppointments,
      totalEarnings: barber.totalEarnings || 0,
      rating: barber.rating || 0,
      ratingsCount: barber.ratingsCount || 0
    });
  } catch (error) {
    console.error('Error getting detailed barber stats:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};