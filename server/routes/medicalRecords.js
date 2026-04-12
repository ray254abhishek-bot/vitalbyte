const express = require('express');
const router = express.Router();
const { MedicalRecord, Notification } = require('../models');
const { protect, restrictTo } = require('../middleware/auth');

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

router.post('/', protect, restrictTo('doctor', 'admin'), async (req, res) => {
  try {
    const record = await MedicalRecord.create({ ...req.body, doctor_id: req.user._id });
    const populated = await record.populate([
      { path: 'patient_id', select: 'name age gender' },
      { path: 'doctor_id',  select: 'name specialization' },
    ]);
    
    // Create notification for patient
    await Notification.create({
      user_id: req.body.patient_id,
      title: '📋 New Medical Record Added',
      message: `Dr. ${req.user.name} has added a new medical record for you. Diagnosis: ${record.diagnosis || 'Check details'}`,
      type: 'medical_record',
      link: '/medical-records',
      metadata: { recordId: record._id, type: 'medical_record' }
    });
    
    // Real-time notification via socket
    const io = req.app.get('io');
    io.to(`user_${req.body.patient_id}`).emit('new_notification', {
      title: 'New Medical Record',
      message: `Dr. ${req.user.name} added a medical record`,
      type: 'medical_record',
      timestamp: new Date()
    });
    io.emit('record_added', populated);
    
    res.status(201).json(populated);
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

// Get single record - for viewing only
router.get('/:id', protect, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patient_id', 'name age gender blood_group')
      .populate('doctor_id', 'name specialization');
    
    if (!record) return res.status(404).json({ message: 'Not found' });
    
    // Check if user has permission to view
    if (req.user.role === 'patient' && record.patient_id._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// No PUT/DELETE for patients - only doctors/admins can edit
router.put('/:id', protect, restrictTo('doctor', 'admin'), async (req, res) => {
  try {
    const record = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const populated = await record.populate(['patient_id', 'doctor_id']);
    
    // Notify patient about update
    await Notification.create({
      user_id: record.patient_id._id,
      title: '✏️ Medical Record Updated',
      message: `Dr. ${req.user.name} has updated your medical record.`,
      type: 'medical_record',
      link: '/medical-records'
    });
    
    const io = req.app.get('io');
    io.to(`user_${record.patient_id._id}`).emit('record_updated', populated);
    
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;