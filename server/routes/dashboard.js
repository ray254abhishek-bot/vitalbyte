const express = require('express');
const router = express.Router();
const { User, Appointment, MedicalRecord, LabReport, Hospital } = require('../models');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/stats', protect, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user._id;
    let stats = {};

    if (role === 'admin') {
      const [patients, doctors, appointments, records, labs, hospitals] = await Promise.all([
        User.countDocuments({ role: 'patient' }),
        User.countDocuments({ role: 'doctor' }),
        Appointment.countDocuments(),
        MedicalRecord.countDocuments(),
        LabReport.countDocuments(),
        Hospital.countDocuments({ is_active: true }),
      ]);
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayAppts = await Appointment.countDocuments({ createdAt: { $gte: todayStart } });
      const pendingAppts = await Appointment.countDocuments({ status: 'pending' });
      stats = { patients, doctors, appointments, records, labs, hospitals, todayAppts, pendingAppts };
    } else if (role === 'doctor') {
      const [myPatients, myAppointments, myRecords, pendingAppts, todayAppts] = await Promise.all([
        Appointment.distinct('patient_id', { doctor_id: userId }),
        Appointment.countDocuments({ doctor_id: userId }),
        MedicalRecord.countDocuments({ doctor_id: userId }),
        Appointment.countDocuments({ doctor_id: userId, status: 'pending' }),
        Appointment.countDocuments({ doctor_id: userId, date: { $gte: new Date().setHours(0,0,0,0) } }),
      ]);
      stats = { myPatients: myPatients.length, myAppointments, myRecords, pendingAppts, todayAppts };
    } else if (role === 'patient') {
      const [appointments, records, labs] = await Promise.all([
        Appointment.countDocuments({ patient_id: userId }),
        MedicalRecord.countDocuments({ patient_id: userId }),
        LabReport.countDocuments({ patient_id: userId }),
      ]);
      const upcoming = await Appointment.countDocuments({
        patient_id: userId, date: { $gte: new Date() }, status: { $in: ['pending','confirmed'] }
      });
      stats = { appointments, records, labs, upcoming };
    }

    // Recent appointments (all roles)
    const recentFilter = {};
    if (role === 'patient') recentFilter.patient_id = userId;
    if (role === 'doctor')  recentFilter.doctor_id  = userId;

    const recentAppointments = await Appointment.find(recentFilter)
      .populate('patient_id','name age')
      .populate('doctor_id','name specialization')
      .sort({ createdAt: -1 }).limit(5);

    res.json({ stats, recentAppointments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
