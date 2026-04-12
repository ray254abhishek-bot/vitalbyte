const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { LabReport, Notification } = require('../models');
const { protect, restrictTo } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/lab-reports')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'patient') filter.patient_id = req.user._id;
    const reports = await LabReport.find(filter)
      .populate('patient_id', 'name age')
      .populate('referred_by', 'name specialization')
      .sort({ uploaded_at: -1 });
    res.json(reports);
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

router.post('/', protect, restrictTo('admin', 'doctor', 'lab_technician'), upload.array('files', 5), async (req, res) => {
  try {
    const files = req.files?.map(f => `/uploads/lab-reports/${f.filename}`) || [];
    const report = await LabReport.create({
      ...req.body,
      record_id: `LR-${uuidv4().slice(0, 8).toUpperCase()}`,
      upload_files: files,
      uploaded_at: new Date(),
      uploaded_by: req.user._id,
      uploaded_by_name: req.user.name,
      uploaded_by_role: req.user.role
    });

    const populated = await report.populate('patient_id', 'name email');
    
    const io = req.app.get('io');
    io.emit('lab_report_update', report);
    
    // Notify patient
    await Notification.create({
      user_id: req.body.patient_id,
      title: '🧪 New Lab Report Available',
      message: `${req.user.role === 'lab_technician' ? 'Lab technician' : `Dr. ${req.user.name}`} has uploaded a new lab report for ${report.test_name || 'your test'}.`,
      type: 'lab_report',
      link: '/lab-reports',
      metadata: { reportId: report._id, type: 'lab_report' }
    });
    
    // Real-time notification for patient
    io.to(`user_${req.body.patient_id}`).emit('new_notification', {
      title: 'New Lab Report',
      message: `A new lab report has been uploaded for you`,
      type: 'lab_report',
      timestamp: new Date()
    });
    
    // Notify referring doctor if exists
    if (req.body.referred_by) {
      await Notification.create({
        user_id: req.body.referred_by,
        title: 'Lab Report Uploaded',
        message: `Lab report for ${populated.patient_id?.name} has been uploaded.`,
        type: 'lab_report',
        link: '/lab-reports'
      });
    }
    
    res.status(201).json(report);
  } catch (err) { 
    console.error('Error uploading lab report:', err);
    res.status(500).json({ message: err.message }); 
  }
});

// Patients can only view, not update
router.put('/:id/status', protect, restrictTo('admin', 'doctor', 'lab_technician'), async (req, res) => {
  try {
    const report = await LabReport.findByIdAndUpdate(
      req.params.id, 
      { status: req.body.status, results: req.body.results }, 
      { new: true }
    );
    
    // Notify patient about status update
    if (report) {
      await Notification.create({
        user_id: report.patient_id,
        title: '📊 Lab Report Status Updated',
        message: `Your lab report status has been updated to ${req.body.status}.`,
        type: 'lab_report',
        link: '/lab-reports'
      });
      
      const io = req.app.get('io');
      io.to(`user_${report.patient_id}`).emit('lab_report_updated', report);
    }
    
    res.json(report);
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

// Get single report for viewing
router.get('/:id', protect, async (req, res) => {
  try {
    const report = await LabReport.findById(req.params.id)
      .populate('patient_id', 'name age gender')
      .populate('referred_by', 'name specialization');
    
    if (!report) return res.status(404).json({ message: 'Not found' });
    
    // Check permission
    if (req.user.role === 'patient' && report.patient_id._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;