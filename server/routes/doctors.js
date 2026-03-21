const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).populate('hospital').select('-__v');
    res.json(doctors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id).populate('hospital');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
