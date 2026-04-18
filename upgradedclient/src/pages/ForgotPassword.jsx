// pages/ForgotPassword.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [method, setMethod] = useState('email'); // 'email' or 'mobile'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: request, 2: verify, 3: reset
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(false);

  const api = useAuth(); // Assuming you have access to api

  const handleSendResetLink = async () => {
    setLoading(true);
    setError('');
    try {
      if (method === 'email') {
        await api.post('/auth/forgot-password', { email });
        setSuccess('Password reset link has been sent to your email');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        await api.post('/auth/send-reset-otp', { phone });
        setStep(2);
        startCountdown();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset request');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-reset-otp', { phone, otp });
      setResetToken(res.data.resetToken);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      if (method === 'mobile') {
        await api.post('/auth/reset-password-mobile', { phone, newPassword, resetToken });
      }
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    setResendDisabled(true);
    let time = 60;
    setCountdown(time);
    const timer = setInterval(() => {
      time--;
      setCountdown(time);
      if (time <= 0) {
        clearInterval(timer);
        setResendDisabled(false);
      }
    }, 1000);
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await api.post('/auth/send-reset-otp', { phone });
      startCountdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800 }}>Reset Password</div>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,77,109,.12)', border: '1px solid rgba(255,77,109,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(0,230,138,.12)', border: '1px solid rgba(0,230,138,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--success)' }}>
            {success}
          </div>
        )}

        {step === 1 && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${method === 'email' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setMethod('email')}
                  style={{ flex: 1 }}
                >
                  📧 Email Reset Link
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${method === 'mobile' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setMethod('mobile')}
                  style={{ flex: 1 }}
                >
                  📱 Mobile OTP
                </button>
              </div>

              {method === 'email' ? (
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    className="form-input"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91XXXXXXXXXX"
                    required
                  />
                </div>
              )}

              <button
                className="btn btn-primary w-full"
                onClick={handleSendResetLink}
                disabled={loading || (method === 'email' ? !email : !phone)}
              >
                {loading ? 'Sending...' : method === 'email' ? 'Send Reset Link' : 'Send OTP'}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--text2)' }}>
              We've sent a 6-digit OTP to {phone}
            </p>
            
            <div className="form-group">
              <label className="form-label">Enter OTP</label>
              <input
                className="form-input"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{ textAlign: 'center', fontSize: 20, letterSpacing: 4 }}
              />
            </div>
            
            <button
              className="btn btn-primary w-full"
              onClick={handleVerifyOTP}
              disabled={loading || !otp}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleResendOTP}
                disabled={resendDisabled}
              >
                {resendDisabled ? `Resend in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>
          </>
        )}

       