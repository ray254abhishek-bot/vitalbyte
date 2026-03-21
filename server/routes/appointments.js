const express = require('express');
const router = express.Router();
const { Appointment, Notification, User } = require('../models');
const { protect, restrictTo } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// GET /api/appointments - list based on role
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'patient') filter.patient_id = req.user._id;
    if (req.user.role === 'doctor')  filter.doctor_id  = req.user._id;

    const appointments = await Appointment.find(filter)
      .populate('patient_id', 'name age gender phone')
      .populate('doctor_id',  'name specialization')
      .sort({ date: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/appointments - book new appointment
router.post('/', protect, async (req, res) => {
  try {
    const { doctor_id, date, time, remarks, type } = req.body;
    const room_id = `appointment_${uuidv4()}`;

    const appointment = await Appointment.create({
      patient_id: req.user._id,
      doctor_id,
      date,
      time,
      remarks,
      type: type || 'in-person',
      room_id,
    });

    const populated = await appointment.populate([
      { path: 'patient_id', select: 'name age gender phone' },
      { path: 'doctor_id',  select: 'name specialization' },
    ]);

    // Create notifications
    await Notification.create([
      {
        user_id: doctor_id,
        title: 'New Appointment Request',
        message: `${req.user.name} has booked an appointment for ${new Date(date).toDateString()} at ${time}`,
        type: 'appointment',
      },
      {
        user_id: req.user._id,
        title: 'Appointment Booked',
        message: `Your appointment with Dr. ${populated.doctor_id.name} is confirmed for ${new Date(date).toDateString()} at ${time}`,
        type: 'appointment',
      },
    ]);

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('appointment_update', populated);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/appointments/:id/status - update status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true }
    ).populate('patient_id', 'name phone').populate('doctor_id', 'name specialization');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    await Notification.create({
      user_id: appointment.patient_id._id,
      title: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your appointment with Dr. ${appointment.doctor_id.name} has been ${status}.`,
      type: 'appointment',
    });

    const io = req.app.get('io');
    io.emit('appointment_update', appointment);

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    const io = req.app.get('io');
    io.emit('appointment_deleted', { id: req.params.id });
    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
