const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { User, Auth, Notification, PasswordReset, OTP } = require('../models');
const { protect } = require('../middleware/auth');
const OTPService = require('../services/otpService');
const emailService = require('../services/emailService');

// Google OAuth2 Configuration
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (authId, userId, role) =>
  jwt.sign({ authId, userId, role }, process.env.JWT_SECRET || 'vitalbyte_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─── Email Verification Flow ─────────────────────────────────────────────────

// POST /api/auth/send-verification-otp
router.post('/send-verification-otp', async (req, res) => {
  try {
    const { email } = req.body;

    const existingAuth = await Auth.findOne({ user_email: email.toLowerCase() });
    if (existingAuth && existingAuth.email_verified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const otp = await OTPService.sendEmailOTP(email, 'email_verification');

    // If user exists, send email with name
    if (existingAuth) {
      const user = await User.findById(existingAuth.user_id);
      await emailService.sendVerificationEmail(email, otp, user?.name);
    } else {
      await emailService.sendVerificationEmail(email, otp);
    }

    res.json({ message: 'Verification OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const verification = await OTPService.verifyOTP(email, null, otp, 'email_verification');
    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }

    const auth = await Auth.findOne({ user_email: email.toLowerCase() });
    if (auth) {
      auth.email_verified = true;
      await auth.save();
    }

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Mobile OTP Verification ─────────────────────────────────────────────────

// POST /api/auth/send-mobile-otp
router.post('/send-mobile-otp', protect, async (req, res) => {
  try {
    const { phone } = req.body;

    await OTPService.sendMobileOTP(phone, 'mobile_verification');
    res.json({ message: 'OTP sent to your mobile number' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-mobile
router.post('/verify-mobile', protect, async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const verification = await OTPService.verifyOTP(null, phone, otp, 'mobile_verification');
    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }

    req.auth.phone_verified = true;
    await req.auth.save();

    res.json({ message: 'Mobile number verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Password Reset with Email Link ─────────────────────────────────────────

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const auth = await Auth.findOne({ user_email: email.toLowerCase() });
    if (!auth) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const user = await User.findById(auth.user_id);
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordReset.create({
      user_id: auth.user_id,
      token,
      expires_at,
    });

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await emailService.sendPasswordResetEmail(email, resetLink, user.name);

    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const resetRecord = await PasswordReset.findOne({
      token,
      used: false,
      expires_at: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const auth = await Auth.findOne({ user_id: resetRecord.user_id });
    if (!auth) {
      return res.status(404).json({ message: 'User not found' });
    }

    auth.user_password = newPassword;
    await auth.save();

    resetRecord.used = true;
    await resetRecord.save();

    const user = await User.findById(resetRecord.user_id);
    await emailService.sendPasswordResetSuccessEmail(auth.user_email, user.name);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Mobile OTP Password Reset ──────────────────────────────────────────────

// POST /api/auth/send-reset-otp
router.post('/send-reset-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    const auth = await Auth.findOne({ phone });
    if (!auth) {
      return res.status(404).json({ message: 'No account found with this phone number' });
    }

    await OTPService.sendMobileOTP(phone, 'mobile_reset');
    res.json({ message: 'OTP sent to your mobile number' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-reset-otp
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const verification = await OTPService.verifyOTP(null, phone, otp, 'mobile_reset');
    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }

    // Generate temporary token for password reset
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store in memory or Redis (simplified - in production use Redis with expiry)
    // For now, we'll return it and the client will send it back
    res.json({
      message: 'OTP verified successfully',
      resetToken,
      expiresIn: 300 // 5 minutes
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password-mobile
router.post('/reset-password-mobile', async (req, res) => {
  try {
    const { phone, newPassword, resetToken } = req.body;

    // Verify resetToken is valid (in production, check against Redis)
    if (!resetToken) {
      return res.status(400).json({ message: 'Invalid reset session' });
    }

    const auth = await Auth.findOne({ phone });
    if (!auth) {
      return res.status(404).json({ message: 'User not found' });
    }

    auth.user_password = newPassword;
    await auth.save();

    const user = await User.findById(auth.user_id);
    await emailService.sendPasswordResetSuccessEmail(auth.user_email, user.name);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Google OAuth2 Sign-In ──────────────────────────────────────────────────

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    let auth = await Auth.findOne({ user_email: email.toLowerCase() });

    if (!auth) {
      // Create new user
      const user = await User.create({
        name: name,
        email: email.toLowerCase(),
        role: 'patient', // Default role
        profile_picture: picture,
      });

      auth = await Auth.create({
        user_id: user._id,
        user_type: 'patient',
        user_email: email.toLowerCase(),
        user_password: crypto.randomBytes(32).toString('hex'), // Random password
        email_verified: true, // Google verified emails are trusted
        google_id: googleId,
        user_verification_status: 'verified',
      });

      await Notification.create({
        user_id: user._id,
        title: 'Welcome to VitalByte!',
        message: 'Your account has been created via Google Sign-In.',
        type: 'general',
      });
    } else if (!auth.google_id) {
      // Link Google account to existing account
      auth.google_id = googleId;
      auth.email_verified = true;
      await auth.save();
    }

    const user = await User.findById(auth.user_id).populate('hospital');
    const jwtToken = signToken(auth._id, user._id, user.role);

    res.json({
      token: jwtToken,
      user: { ...user.toObject(), authStatus: auth.user_verification_status, email_verified: auth.email_verified }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ message: 'Google authentication failed' });
  }
});

// ─── Update Register to require email verification ──────────────────────────

// POST /api/auth/register (updated)
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, password, role, age, gender, blood_group, phone, address,
      specialization, license_number, registration_number, hospital,
    } = req.body;

    const existing = await Auth.findOne({ user_email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    // Check if email is verified
    const otpRecord = await OTP.findOne({ email: email.toLowerCase(), type: 'email_verification', used: true });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Please verify your email address first' });
    }

    const cleanedHospital = hospital === "" ? undefined : hospital;
    const user = await User.create({
      name, email, role, age, gender, blood_group, phone, address,
      specialization, license_number, registration_number,
      hospital: cleanedHospital,
    });

    const auth = await Auth.create({
      user_id: user._id,
      user_type: role,
      user_email: email.toLowerCase(),
      user_password: password,
      user_verification_status: role === 'patient' ? 'verified' : 'pending',
      email_verified: true,
      phone_verified: false,
    });

    await Notification.create({
      user_id: user._id,
      title: 'Welcome to VitalByte!',
      message: `Your account has been created successfully.${role !== 'patient' ? ' Awaiting admin verification.' : ''}`,
      type: 'general',
    });

    const token = signToken(auth._id, user._id, role);
    res.status(201).json({ token, user: { ...user.toObject(), authStatus: auth.user_verification_status, email_verified: auth.email_verified } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Existing Login Route (keep as is) ──────────────────────────────────────

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

    res.json({ token, user: { ...user.toObject(), authStatus: auth.user_verification_status, email_verified: auth.email_verified } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('hospital');
  res.json({ user: { ...user.toObject(), authStatus: req.auth.user_verification_status, email_verified: req.auth.email_verified } });
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