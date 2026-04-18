// pages/Register.jsx - Updated with email verification

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const { register, error, setError, api } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: form, 2: email verification
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'patient', age: '', gender: '', blood_group: '',
    phone: '', address: '', allergies: '',
    specialization: '', license_number: '', registration_number: '', hospital: '',
  });

  useEffect(() => {
    api.get('/hospitals').then(r => setHospitals(r.data)).catch(() => {});
  }, [api]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Step 1: Send OTP to email
  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (!form.email) {
      setError('Email is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/send-verification-otp', { email: form.email });
      setOtpSent(true);
      setStep(2);
      
      // Start countdown for resend
      let time = 60;
      setCountdown(time);
      const timer = setInterval(() => {
        time--;
        setCountdown(time);
        if (time <= 0) clearInterval(timer);
      }, 1000);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/verify-email', { email: form.email, otp: emailOtp });
      setEmailVerified(true);
      // Proceed to create account
      await createAccount();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await api.post('/auth/send-verification-otp', { email: form.email });
      let time = 60;
      setCountdown(time);
      const timer = setInterval(() => {
        time--;
        setCountdown(time);
        if (time <= 0) clearInterval(timer);
      }, 1000);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Create account after email verification
  const createAccount = async () => {
    try {
      const payload = {
        ...form,
        hospital: form.hospital || null,
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()) : []
      };
      delete payload.confirmPassword;
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      setStep(1);
    }
  };

  // Go back to form
  const handleBack = () => {
    setStep(1);
    setError('');
    setEmailOtp('');
  };

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div className="auth-logo">
          <div style={{ fontSize: 32, marginBottom: 6 }}>💊</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800 }}>VitalByte</div>
        </div>

        <div className="auth-title">Create Account</div>
        <div className="auth-sub">Join VitalByte for seamless health record management</div>

        {error && (
          <div style={{ background: 'rgba(255,77,109,.12)', border: '1px solid rgba(255,77,109,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {/* Step 1: Registration Form */}
        {step === 1 && (
          <form onSubmit={handleSendOTP}>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">I am a</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['patient', 'doctor', 'admin'].map(r => (
                  <button key={r} type="button"
                    className={`btn btn-sm ${form.role === r ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                    onClick={() => setForm(f => ({ ...f, role: r }))}
                  >{r}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" name="phone" value={form.phone} onChange={handleChange} />
              </div>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" name="password" value={form.password} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="form-input" type="number" name="age" value={form.age} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-select" name="gender" value={form.gender} onChange={handleChange}>
                  <option value="">Select</option>
                  <option>male</option><option>female</option><option>other</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-select" name="blood_group" value={form.blood_group} onChange={handleChange}>
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" name="address" value={form.address} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Allergies (comma separated)</label>
              <input className="form-input" name="allergies" value={form.allergies} onChange={handleChange} placeholder="Penicillin, Peanuts..." />
            </div>

            {form.role === 'doctor' && (
              <>
                <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Doctor Details</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Specialization</label>
                    <input className="form-input" name="specialization" value={form.specialization} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hospital</label>
                    <select className="form-select" name="hospital" value={form.hospital} onChange={handleChange}>
                      <option value="">Select Hospital</option>
                      {hospitals.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">License Number</label>
                    <input className="form-input" name="license_number" value={form.license_number} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Registration Number</label>
                    <input className="form-input" name="registration_number" value={form.registration_number} onChange={handleChange} />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Continue →'}
            </button>
          </form>
        )}

        {/* Step 2: Email Verification */}
        {step === 2 && (
          <div>
            <div style={{ 
              background: 'rgba(0,194,255,.1)', 
              border: '1px solid rgba(0,194,255,.3)', 
              borderRadius: 10, 
              padding: '16px', 
              marginBottom: 20,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📧</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Verify Your Email</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                We've sent a 6-digit OTP to <strong>{form.email}</strong>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Enter OTP</label>
              <input
                className="form-input"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={emailOtp}
                onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                style={{ textAlign: 'center', fontSize: 20, letterSpacing: 4 }}
                autoFocus
              />
            </div>

            <button 
              className="btn btn-primary w-full" 
              onClick={handleVerifyOTP}
              disabled={loading || !emailOtp}
              style={{ marginBottom: 12 }}
            >
              {loading ? 'Verifying...' : '✓ Verify & Create Account'}
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                className="btn btn-outline" 
                onClick={handleBack}
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={handleResendOTP}
                disabled={countdown > 0}
                style={{ flex: 1 }}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}

        <div className="auth-footer">
          Already have an account? <span onClick={() => navigate('/login')}>Sign in</span>
        </div>
      </div>
    </div>
  );
}