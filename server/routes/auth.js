const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, Auth, Notification } = require('../models');
const { protect } = require('../middleware/auth');

const signToken = (authId, userId, role) =>
  jwt.sign({ authId, userId, role }, process.env.JWT_SECRET || 'vitalbyte_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, password, role, age, gender, blood_group, phone, address,
      specialization, license_number, registration_number, hospital,
    } = req.body;

    const existing = await Auth.findOne({ user_email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const cleanedHospital = hospital === "" ? undefined : hospital;
    const user = await User.create({
      name, email, role, age, gender, blood_group, phone, address,
      specialization, license_number, registration_number,
      hospital: cleanedHospital, // Use cleaned value
    });

    const auth = await Auth.create({
      user_id: user._id,
      user_type: role,
      user_email: email.toLowerCase(),
      user_password: password,
      user_verification_status: role === 'patient' ? 'verified' : 'pending',
    });

    await Notification.create({
      user_id: user._id,
      title: 'Welcome to VitalByte!',
      message: `Your account has been created successfully.${role !== 'patient' ? ' Awaiting admin verification.' : ''}`,
      type: 'general',
    });

    const token = signToken(auth._id, user._id, role);
    res.status(201).json({ token, user: { ...user.toObject(), authStatus: auth.user_verification_status } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const auth = await Auth.findOne({ user_email: email.toLowerCase() });
    if (!auth) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await auth.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    if (!auth.user_active) return res.status(403).json({ message: 'Account deactivated' });

    auth.last_login = new Date();
    await auth.save();

    const user = await User.findById(auth.user_id).populate('hospital');
    const token = signToken(auth._id, user._id, user.role);

    res.json({ token, user: { ...user.toObject(), authStatus: auth.user_verification_status } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('hospital');
  res.json({ user: { ...user.toObject(), authStatus: req.auth.user_verification_status } });
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const valid = await req.auth.comparePassword(currentPassword);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });
    req.auth.user_password = newPassword;
    await req.auth.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
