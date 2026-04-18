// server/routes/aadhaar.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { User, Auth } = require('../models');

// POST /api/aadhaar/verify
router.post('/verify', protect, async (req, res) => {
  try {
    const { aadhar_number, name, dob } = req.body;
    
    if (!aadhar_number) {
      return res.status(400).json({ message: 'Aadhaar number is required' });
    }
    
    // Validate Aadhaar number format (12 digits)
    const aadharRegex = /^[2-9]{1}[0-9]{11}$/;
    if (!aadharRegex.test(aadhar_number)) {
      return res.status(400).json({ message: 'Invalid Aadhaar number format. Must be 12 digits starting with 2-9' });
    }
    
    // In production, integrate with UIDAI API
    // For demo, we'll simulate verification
    console.log(`🔐 Verifying Aadhaar: ${aadhar_number} for user: ${req.user._id}`);
    
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For demo purposes, consider any valid format as verified
    const isVerified = true;
    
    if (isVerified) {
      // Update user's Aadhaar verification status
      await User.findByIdAndUpdate(req.user._id, {
        aadhar_number: aadhar_number,
        aadhar_verified: true,
      });
      
      // Update auth if needed
      await Auth.findOneAndUpdate(
        { user_id: req.user._id },
        { user_verification_status: 'verified' }
      );
      
      res.json({
        success: true,
        message: 'Aadhaar verified successfully',
        aadhar_verified: true,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Aadhaar verification failed',
      });
    }
  } catch (err) {
    console.error('Aadhaar verification error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/aadhaar/status
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      aadhar_verified: user?.aadhar_verified || false,
      aadhar_number: user?.aadhar_number ? '****' + user.aadhar_number.slice(-4) : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;