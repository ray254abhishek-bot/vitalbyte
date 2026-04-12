require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);

// ─── Socket.io Setup ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vitalbyte')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/patients',     require('./routes/patients'));
app.use('/api/doctors',      require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/medical-records', require('./routes/medicalRecords'));
app.use('/api/lab-reports',  require('./routes/labReports'));
app.use('/api/hospitals',    require('./routes/hospitals'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/complaints', require('./routes/complaints'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── Socket.io Real-Time Events ───────────────────────────────────────────────
const connectedUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Register user with their userId
    socket.on('register', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    // Join user-specific room
    socket.join(`user_${userId}`);
    io.emit('online_users', Array.from(connectedUsers.keys()));
    console.log(`👤 User ${userId} registered on socket ${socket.id}`);
  });

  // Join a room (e.g. doctor-patient chat)
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`🚪 Socket ${socket.id} joined room ${roomId}`);
  });

  // Real-time appointment notification
  socket.on('appointment_request', (data) => {
    const doctorSocketId = connectedUsers.get(data.doctorId);
    if (doctorSocketId) {
      io.to(doctorSocketId).emit('new_appointment', {
        ...data,
        timestamp: new Date(),
      });
    }
    // Broadcast to all admins
    socket.broadcast.emit('appointment_update', data);
  });

  // Appointment status update (doctor accepts/rejects)
  socket.on('appointment_status_update', (data) => {
    const patientSocketId = connectedUsers.get(data.patientId);
    if (patientSocketId) {
      io.to(patientSocketId).emit('appointment_status_changed', {
        ...data,
        timestamp: new Date(),
      });
    }
    io.emit('dashboard_refresh', { type: 'appointment' });
  });

  // Emergency alert
  socket.on('emergency_alert', (data) => {
    console.log(`🚨 Emergency from ${data.patientId}`);
    // Broadcast emergency to ALL connected users (doctors/admins)
    io.emit('emergency_broadcast', {
      ...data,
      timestamp: new Date(),
      alertId: require('uuid').v4(),
    });
  });

  // Doctor-Patient real-time message
  socket.on('send_message', (data) => {
    const { roomId, message, senderId, senderName, senderRole } = data;
    io.to(roomId).emit('receive_message', {
      message,
      senderId,
      senderName,
      senderRole,
      timestamp: new Date(),
    });
  });

  // Lab report uploaded notification
  socket.on('lab_report_uploaded', (data) => {
    const doctorSocketId = connectedUsers.get(data.doctorId);
    if (doctorSocketId) {
      io.to(doctorSocketId).emit('new_lab_report', {
        ...data,
        timestamp: new Date(),
      });
    }
  });

  // Typing indicator
  socket.on('typing', ({ roomId, senderName }) => {
    socket.to(roomId).emit('user_typing', { senderName });
  });

  socket.on('stop_typing', ({ roomId }) => {
    socket.to(roomId).emit('user_stop_typing');
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      io.emit('online_users', Array.from(connectedUsers.keys()));
    }
    console.log(`🔴 Socket disconnected: ${socket.id}`);
  });
});

// Export io for use in controllers
module.exports.io = io;

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 VitalByte Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io ready for real-time connections`);
});
