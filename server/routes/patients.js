// patients.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' }).select('-__v');
    res.json(patients);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const patient = await User.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
