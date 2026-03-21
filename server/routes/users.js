// ── users.js ──────────────────────────────────────────────────────────────────
const express = require('express');
const r1 = express.Router();
const { User, Auth, Notification } = require('../models');
const { protect, restrictTo } = require('../middleware/auth');

r1.get('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const users = await User.find().populate('hospital');
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

r1.get('/notifications', protect, async (req, res) => {
  try {
    const notifs = await Notification.find({ user_id: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json(notifs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

r1.put('/notifications/:id/read', protect, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ success: true });
});

r1.put('/:id', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('hospital');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

r1.put('/:id/verify', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const auth = await Auth.findOneAndUpdate(
      { user_id: req.params.id }, { user_verification_status: status }, { new: true }
    );
    await Notification.create({
      user_id: req.params.id,
      title: `Account ${status === 'verified' ? 'Verified' : 'Rejected'}`,
      message: `Your account has been ${status} by the admin.`,
      type: 'general',
    });
    res.json(auth);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = r1;
