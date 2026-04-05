const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Complaint, Notification, User } = require('../models');
const { protect, restrictTo } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/complaints');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/complaints - list complaints based on role
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
      filter.user_id = req.user._id;
    }
    
    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 });
    
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/complaints/stats - admin stats
router.get('/stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    const stats = {
      total: await Complaint.countDocuments(),
      pending: await Complaint.countDocuments({ status: 'pending' }),
      inReview: await Complaint.countDocuments({ status: 'in_review' }),
      resolved: await Complaint.countDocuments({ status: 'resolved' }),
      rejected: await Complaint.countDocuments({ status: 'rejected' }),
      byCategory: {},
      byPriority: {},
    };
    
    const categories = ['technical', 'medical', 'billing', 'staff', 'suggestion', 'other'];
    for (const cat of categories) {
      stats.byCategory[cat] = await Complaint.countDocuments({ category: cat });
    }
    
    const priorities = ['low', 'medium', 'high', 'urgent'];
    for (const pri of priorities) {
      stats.byPriority[pri] = await Complaint.countDocuments({ priority: pri });
    }
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/complaints - create new complaint
router.post('/', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    const attachments = req.files?.map(f => `/uploads/complaints/${f.filename}`) || [];
    
    const complaint = await Complaint.create({
      user_id: req.user._id,
      user_name: req.user.name,
      user_role: req.user.role,
      subject: req.body.subject,
      description: req.body.description,
      category: req.body.category || 'other',
      priority: req.body.priority || 'medium',
      attachments,
      is_anonymous: req.body.is_anonymous === 'true',
    });
    
    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        user_id: admin._id,
        title: 'New Complaint Received',
        message: `New ${complaint.priority} priority complaint from ${complaint.is_anonymous ? 'Anonymous' : complaint.user_name}: ${complaint.subject}`,
        type: 'general',
        link: '/complaints',
      });
    }
    
    // Emit socket event for real-time admin notification
    const io = req.app.get('io');
    if (io) {
      io.emit('new_complaint', complaint);
    }
    
    res.status(201).json(complaint);
  } catch (err) {
    console.error('Error creating complaint:', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/complaints/:id/status - update complaint status (admin only)
router.put('/:id/status', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { status, admin_response } = req.body;
    const updateData = { status };
    
    if (admin_response) {
      updateData.admin_response = admin_response;
    }
    
    if (status === 'resolved') {
      updateData.resolved_at = new Date();
    }
    
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    
    // Notify the user who filed the complaint
    await Notification.create({
      user_id: complaint.user_id,
      title: `Complaint ${status === 'resolved' ? 'Resolved' : 'Updated'}`,
      message: `Your complaint "${complaint.subject}" has been ${status.replace('_', ' ')}.${admin_response ? ' Admin response: ' + admin_response : ''}`,
      type: 'general',
      link: '/complaints',
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('complaint_updated', complaint);
    }
    
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/complaints/:id - delete complaint (admin only)
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ message: 'Complaint deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;