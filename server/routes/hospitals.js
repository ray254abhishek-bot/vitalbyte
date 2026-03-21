// hospitals.js
const express = require('express');
const router = express.Router();
const { Hospital } = require('../models');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const hospitals = await Hospital.find({ is_active: true });
    res.json(hospitals);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.create(req.body);
    res.status(201).json(hospital);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(hospital);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    await Hospital.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ message: 'Hospital deactivated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
