const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── User Model ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  role:            { type: String, enum: ['patient', 'doctor', 'admin', 'lab_technician'], required: true },
  age:             { type: Number },
  gender:          { type: String, enum: ['male', 'female', 'other'] },
  blood_group:     { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'] },
  phone:           { type: String },
  email:           { type: String, required: true, unique: true, lowercase: true },
  address:         { type: String },
  aadhar_verified: { type: Boolean, default: false },
  aadhar_number:   { type: String },
  allergies:       [{ type: String }],
  // Doctor-specific fields
  specialization:  { type: String },
  hospital:        { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital',required: false },
  license_number:  { type: String },
  registration_number: { type: String },
  profile_picture: { type: String },
  is_active:       { type: Boolean, default: true },
}, { timestamps: true });

// ─── Authentication Model ─────────────────────────────────────────────────────
const authSchema = new mongoose.Schema({
  user_id:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user_type:          { type: String, enum: ['patient', 'doctor', 'admin', 'lab_technician'], required: true },
  user_email:         { type: String, required: true, unique: true, lowercase: true },
  user_password:      { type: String, required: true },
  user_active:        { type: Boolean, default: true },
  user_verification_status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  last_login:         { type: Date },
  otp:                { type: String },
  otp_expires:        { type: Date },
  refresh_token:      { type: String },
}, { timestamps: true });

authSchema.pre('save', async function(next) {
  if (!this.isModified('user_password')) return next();
  this.user_password = await bcrypt.hash(this.user_password, 12);
  next();
});

authSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.user_password);
};

// ─── Hospital Model ───────────────────────────────────────────────────────────
const hospitalSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  address: { type: String, required: true },
  phone:   { type: String },
  email:   { type: String },
  type:    { type: String, enum: ['government', 'private', 'clinic'], default: 'private' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// ─── Appointment Model ────────────────────────────────────────────────────────
const appointmentSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:       { type: Date, required: true },
  time:       { type: String, required: true },
  remarks:    { type: String },
  status:     { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'], default: 'pending' },
  type:       { type: String, enum: ['in-person', 'online'], default: 'in-person' },
  notes:      { type: String },
  room_id:    { type: String }, // for socket room
}, { timestamps: true });

// ─── Medical Record Model ─────────────────────────────────────────────────────
const medicalRecordSchema = new mongoose.Schema({
  patient_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:          { type: Date, default: Date.now },
  prescriptions: [{
    medicine:  String,
    dosage:    String,
    frequency: String,
    duration:  String,
    notes:     String,
  }],
  diagnosis:     { type: String },
  symptoms:      [{ type: String }],
  vital_signs: {
    blood_pressure: String,
    pulse:          String,
    temperature:    String,
    weight:         String,
    height:         String,
    oxygen_level:   String,
  },
  other_records: { type: String },
  follow_up_date: { type: Date },
  is_emergency:  { type: Boolean, default: false },
}, { timestamps: true });

// ─── Lab Report Model ─────────────────────────────────────────────────────────
const labReportSchema = new mongoose.Schema({
  patient_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referred_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  record_id:   { type: String, unique: true },
  test_name:   { type: String },
  test_type:   { type: String },
  upload_files: [{ type: String }],
  results:     { type: String },
  status:      { type: String, enum: ['pending', 'processing', 'completed'], default: 'pending' },
  uploaded_at: { type: Date, default: Date.now },
  notes:       { type: String },
}, { timestamps: true });

// ─── Message Model (for real-time chat) ──────────────────────────────────────
const messageSchema = new mongoose.Schema({
  room_id:     { type: String, required: true },
  sender_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender_name: { type: String },
  sender_role: { type: String },
  message:     { type: String, required: true },
  read:        { type: Boolean, default: false },
}, { timestamps: true });

// ─── Notification Model ───────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  user_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  type:     { type: String, enum: ['appointment', 'lab_report', 'emergency', 'general', 'message'], default: 'general' },
  read:     { type: Boolean, default: false },
  link:     { type: String },
}, { timestamps: true });

module.exports = {
  User:          mongoose.model('User',          userSchema),
  Auth:          mongoose.model('Auth',          authSchema),
  Hospital:      mongoose.model('Hospital',      hospitalSchema),
  Appointment:   mongoose.model('Appointment',   appointmentSchema),
  MedicalRecord: mongoose.model('MedicalRecord', medicalRecordSchema),
  LabReport:     mongoose.model('LabReport',     labReportSchema),
  Message:       mongoose.model('Message',       messageSchema),
  Notification:  mongoose.model('Notification',  notificationSchema),
};
