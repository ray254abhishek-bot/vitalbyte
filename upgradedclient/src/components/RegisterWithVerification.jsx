// Add this to your existing Register.jsx component

// components/RegisterWithVerification.jsx - Updated registration

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EmailVerificationModal from './EmailVerificationModal';

export default function RegisterWithVerification() {
  const { register, api } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: form, 2: email verify
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'patient', age: '', gender: '', blood_group: '',
    phone: '', address: '', allergies: '',
    specialization: '', license_number: '', registration_number: '', hospital: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSendVerification = async (e) => {
    e.preventDefault();
    
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setError('');
    setShowEmailModal(true);
  };

  const handleEmailVerified = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
      setShowEmailModal(false);
    }
  };

  return (
    <div className="auth-page">
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

        <form onSubmit={handleSendVerification}>
          {/* Your existing form fields here */}
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input 
              className="form-input" 
              type="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              required 
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              We'll send a verification code to this email
            </div>
          </div>
          
          {/* Rest of your form fields */}
          
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Processing...' : 'Continue'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <span onClick={() => navigate('/login')}>Sign in</span>
        </div>
      </div>

      {showEmailModal && (
        <EmailVerificationModal
          email={form.email}
          onVerified={handleEmailVerified}
          onClose={() => setShowEmailModal(false)}
          api={api}
        />
      )}
    </div>
  );
}