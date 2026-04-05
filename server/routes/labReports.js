
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

// Allow doctors, admins, and lab technicians to upload lab reports
router.post('/', protect, restrictTo('admin', 'doctor', 'lab_technician'), upload.array('files', 5), async (req, res) => {
  try {
    const files = req.files?.map(f => `/uploads/lab-reports/${f.filename}`) || [];
    const report = await LabReport.create({
      ...req.body,
      record_id: `LR-${uuidv4().slice(0, 8).toUpperCase()}`,
      upload_files: files,
      uploaded_at: new Date(),
    });

    const io = req.app.get('io');
    io.emit('lab_report_update', report);

    // Notify the referring doctor if specified
    if (req.body.referred_by) {
      await Notification.create({
        user_id: req.body.referred_by,
        title: 'Lab Report Uploaded',
        message: `A new lab report has been uploaded for patient.`,
        type: 'lab_report',
      });
    }
    
    // Notify the patient
    await Notification.create({
      user_id: req.body.patient_id,
      title: 'Lab Report Available',
      message: `Your lab report for ${req.body.test_name || 'test'} is now available.`,
      type: 'lab_report',
    });
    
    res.status(201).json(report);
  } catch (err) { 
    console.error('Error uploading lab report:', err);
    res.status(500).json({ message: err.message }); 
  }
});

// Allow doctors, admins, and lab technicians to update status
router.put('/:id/status', protect, restrictTo('admin', 'doctor', 'lab_technician'), async (req, res) => {
  try {
    const report = await LabReport.findByIdAndUpdate(
      req.params.id, 
      { status: req.body.status, results: req.body.results }, 
      { new: true }
    );
    const io = req.app.get('io');
    io.emit('lab_report_update', report);
    res.json(report);
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

module.exports = router;