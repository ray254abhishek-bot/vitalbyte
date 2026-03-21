// ─── medicalRecords.js ────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { MedicalRecord, Notification } = require('../models');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'patient') filter.patient_id = req.user._id;
    if (req.user.role === 'doctor')  filter.doctor_id  = req.user._id;
    const records = await MedicalRecord.find(filter)
      .populate('patient_id', 'name age gender blood_group')
      .populate('doctor_id',  'name specialization')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const record = await MedicalRecord.create({ ...req.body, doctor_id: req.user._id });
    const populated = await record.populate([
      { path: 'patient_id', select: 'name age gender' },
      { path: 'doctor_id',  select: 'name specialization' },
    ]);
    await Notification.create({
      user_id: req.body.patient_id,
      title: 'New Medical Record Added',
      message: `Dr. ${req.user.name} has added a new medical record for you.`,
      type: 'general',
    });
    const io = req.app.get('io');
    io.emit('record_added', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patient_id').populate('doctor_id');
    if (!record) return res.status(404).json({ message: 'Not found' });
    res.json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
