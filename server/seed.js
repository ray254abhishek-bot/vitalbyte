/**
 * VitalByte - Database Seeder
 * Run: node seed.js
 * Creates demo admin, doctor, patient + sample hospital
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vitalbyte';

// ── Inline schemas (no circular deps) ────────────────────────────────────────
const hospitalSchema = new mongoose.Schema({ name: String, address: String, phone: String, type: { type: String, default: 'private' }, is_active: { type: Boolean, default: true } }, { timestamps: true });
const userSchema     = new mongoose.Schema({ name: String, role: String, age: Number, gender: String, blood_group: String, phone: String, email: String, address: String, aadhar_verified: Boolean, allergies: [String], specialization: String, hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }, license_number: String, registration_number: String, is_active: { type: Boolean, default: true } }, { timestamps: true });
const authSchema     = new mongoose.Schema({ user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, user_type: String, user_email: String, user_password: String, user_active: { type: Boolean, default: true }, user_verification_status: { type: String, default: 'verified' } }, { timestamps: true });
const notifSchema    = new mongoose.Schema({ user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, title: String, message: String, type: String, read: { type: Boolean, default: false } }, { timestamps: true });
const apptSchema     = new mongoose.Schema({ patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, date: Date, time: String, remarks: String, status: { type: String, default: 'confirmed' }, type: { type: String, default: 'in-person' } }, { timestamps: true });
const recordSchema   = new mongoose.Schema({ patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, date: Date, diagnosis: String, symptoms: [String], prescriptions: [{ medicine: String, dosage: String, frequency: String, duration: String }], vital_signs: { blood_pressure: String, pulse: String, temperature: String, oxygen_level: String }, other_records: String }, { timestamps: true });

const Hospital      = mongoose.model('Hospital',      hospitalSchema);
const User          = mongoose.model('User',          userSchema);
const Auth          = mongoose.model('Auth',          authSchema);
const Notification  = mongoose.model('Notification',  notifSchema);
const Appointment   = mongoose.model('Appointment',   apptSchema);
const MedicalRecord = mongoose.model('MedicalRecord', recordSchema);

async function seed() {
  console.log('\n🌱  VitalByte Database Seeder');
  console.log('================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected to MongoDB\n');

  // Clear existing data
  await Promise.all([Hospital, User, Auth, Notification, Appointment, MedicalRecord].map(M => M.deleteMany({})));
  console.log('🧹  Cleared existing data\n');

  // Create hospitals
  const h1 = await Hospital.create({ name: 'City General Hospital',     address: '12 MG Road, Kolkata 700001', phone: '033-22001234', type: 'government' });
  const h2 = await Hospital.create({ name: 'Apollo Multispeciality',    address: '58 Canal Circular Road, Kolkata', phone: '033-23456789', type: 'private' });
  const h3 = await Hospital.create({ name: 'Sunrise Clinic & Diagnostics', address: '5 Park Street, Kolkata 700016', phone: '033-22224444', type: 'clinic' });
  console.log('🏨  Created 3 hospitals');

  const hash = async (pw) => bcrypt.hash(pw, 12);

  // Create Admin
  const admin = await User.create({ name: 'Admin User', role: 'admin', email: 'admin@vitalbyte.com', phone: '9800000001', gender: 'male', age: 35, address: 'Kolkata, WB', aadhar_verified: true });
  await Auth.create({ user_id: admin._id, user_type: 'admin', user_email: 'admin@vitalbyte.com', user_password: await hash('admin123'), user_verification_status: 'verified' });

  // Create Doctors
  const doc1 = await User.create({ name: 'Rajesh Sharma', role: 'doctor', email: 'doctor@vitalbyte.com', phone: '9800000002', gender: 'male', age: 45, blood_group: 'O+', address: 'Salt Lake, Kolkata', specialization: 'Cardiology', hospital: h1._id, license_number: 'KOL-MCI-12345', registration_number: 'WB-DOC-001', aadhar_verified: true });
  await Auth.create({ user_id: doc1._id, user_type: 'doctor', user_email: 'doctor@vitalbyte.com', user_password: await hash('doctor123'), user_verification_status: 'verified' });

  const doc2 = await User.create({ name: 'Priya Banerjee', role: 'doctor', email: 'priya@vitalbyte.com', phone: '9800000003', gender: 'female', age: 38, blood_group: 'A+', address: 'New Town, Kolkata', specialization: 'Neurology', hospital: h2._id, license_number: 'KOL-MCI-67890', registration_number: 'WB-DOC-002', aadhar_verified: true });
  await Auth.create({ user_id: doc2._id, user_type: 'doctor', user_email: 'priya@vitalbyte.com', user_password: await hash('doctor456'), user_verification_status: 'verified' });

  const doc3 = await User.create({ name: 'Amit Kumar', role: 'doctor', email: 'amit@vitalbyte.com', phone: '9800000004', gender: 'male', age: 52, blood_group: 'B+', address: 'Howrah, WB', specialization: 'Orthopedics', hospital: h3._id, license_number: 'KOL-MCI-11111', registration_number: 'WB-DOC-003', aadhar_verified: true });
  await Auth.create({ user_id: doc3._id, user_type: 'doctor', user_email: 'amit@vitalbyte.com', user_password: await hash('doctor789'), user_verification_status: 'verified' });

  console.log('👨‍⚕️  Created 3 doctors');

  // Create Patients
  const pat1 = await User.create({ name: 'Sanjay Gupta', role: 'patient', email: 'patient@vitalbyte.com', phone: '9800001001', gender: 'male', age: 29, blood_group: 'B+', address: 'Park Street, Kolkata', allergies: ['Penicillin'], aadhar_verified: true });
  await Auth.create({ user_id: pat1._id, user_type: 'patient', user_email: 'patient@vitalbyte.com', user_password: await hash('patient123'), user_verification_status: 'verified' });

  const pat2 = await User.create({ name: 'Anita Roy', role: 'patient', email: 'anita@vitalbyte.com', phone: '9800001002', gender: 'female', age: 34, blood_group: 'A-', address: 'Behala, Kolkata', allergies: ['Peanuts', 'Dust'], aadhar_verified: true });
  await Auth.create({ user_id: pat2._id, user_type: 'patient', user_email: 'anita@vitalbyte.com', user_password: await hash('patient456'), user_verification_status: 'verified' });

  const pat3 = await User.create({ name: 'Ravi Singh', role: 'patient', email: 'ravi@vitalbyte.com', phone: '9800001003', gender: 'male', age: 55, blood_group: 'AB+', address: 'Dum Dum, Kolkata', allergies: [], aadhar_verified: false });
  await Auth.create({ user_id: pat3._id, user_type: 'patient', user_email: 'ravi@vitalbyte.com', user_password: await hash('patient789'), user_verification_status: 'verified' });

  console.log('🧑‍⚕️  Created 3 patients');

  // Create sample appointments
  const today   = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  await Appointment.insertMany([
    { patient_id: pat1._id, doctor_id: doc1._id, date: tomorrow,   time: '10:00 AM', remarks: 'Chest pain and shortness of breath', status: 'confirmed', type: 'in-person' },
    { patient_id: pat1._id, doctor_id: doc2._id, date: yesterday,  time: '2:30 PM',  remarks: 'Headache for 3 days', status: 'completed', type: 'in-person' },
    { patient_id: pat2._id, doctor_id: doc1._id, date: tomorrow,   time: '11:30 AM', remarks: 'Regular cardiac checkup', status: 'pending',   type: 'online' },
    { patient_id: pat3._id, doctor_id: doc3._id, date: today,      time: '4:00 PM',  remarks: 'Knee pain after fall', status: 'confirmed', type: 'in-person' },
    { patient_id: pat2._id, doctor_id: doc3._id, date: yesterday,  time: '9:00 AM',  remarks: 'Back pain follow-up', status: 'completed', type: 'in-person' },
  ]);
  console.log('📅  Created 5 appointments');

  // Create sample medical records
  await MedicalRecord.insertMany([
    {
      patient_id: pat1._id, doctor_id: doc2._id,
      date: yesterday,
      diagnosis: 'Tension Headache',
      symptoms: ['Headache', 'Neck stiffness', 'Light sensitivity'],
      vital_signs: { blood_pressure: '120/80', pulse: '72 bpm', temperature: '98.6°F', oxygen_level: '98%' },
      prescriptions: [
        { medicine: 'Ibuprofen 400mg', dosage: '1 tablet', frequency: '3x daily', duration: '5 days' },
        { medicine: 'Paracetamol 500mg', dosage: '2 tablets', frequency: 'As needed', duration: '7 days' },
      ],
      other_records: 'Patient advised to reduce screen time and take adequate rest.',
    },
    {
      patient_id: pat3._id, doctor_id: doc3._id,
      date: today,
      diagnosis: 'Knee Ligament Sprain',
      symptoms: ['Knee pain', 'Swelling', 'Limited mobility'],
      vital_signs: { blood_pressure: '130/85', pulse: '78 bpm', temperature: '98.4°F', oxygen_level: '97%' },
      prescriptions: [
        { medicine: 'Diclofenac Gel', dosage: 'Apply topically', frequency: '2x daily', duration: '2 weeks' },
        { medicine: 'Calcium + D3', dosage: '1 tablet', frequency: 'Once daily', duration: '1 month' },
      ],
      other_records: 'X-ray shows no fracture. Physiotherapy recommended.',
    },
    {
      patient_id: pat2._id, doctor_id: doc1._id,
      date: yesterday,
      diagnosis: 'Hypertension - Stage 1',
      symptoms: ['High BP', 'Occasional dizziness', 'Fatigue'],
      vital_signs: { blood_pressure: '145/95', pulse: '82 bpm', temperature: '98.7°F', oxygen_level: '99%' },
      prescriptions: [
        { medicine: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days' },
      ],
      other_records: 'Advised low-sodium diet, regular exercise, follow-up in 2 weeks.',
    },
  ]);
  console.log('📋  Created 3 medical records');

  // Welcome notifications
  const allUsers = [admin, doc1, doc2, doc3, pat1, pat2, pat3];
  await Notification.insertMany(allUsers.map(u => ({
    user_id: u._id, title: 'Welcome to VitalByte! 💊',
    message: 'Your account is ready. Explore your dashboard to get started.',
    type: 'general',
  })));
  console.log('🔔  Created welcome notifications\n');

  console.log('================================');
  console.log('✅  Database seeded successfully!\n');
  console.log('🔑  DEMO LOGIN CREDENTIALS:');
  console.log('--------------------------------');
  console.log('  Admin   : admin@vitalbyte.com   / admin123');
  console.log('  Doctor  : doctor@vitalbyte.com  / doctor123');
  console.log('  Doctor2 : priya@vitalbyte.com   / doctor456');
  console.log('  Doctor3 : amit@vitalbyte.com    / doctor789');
  console.log('  Patient : patient@vitalbyte.com / patient123');
  console.log('  Patient2: anita@vitalbyte.com   / patient456');
  console.log('  Patient3: ravi@vitalbyte.com    / patient789');
  console.log('================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
