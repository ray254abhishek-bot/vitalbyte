// components/EmailVerificationModal.jsx

import React, { useState } from 'react';

export default function EmailVerificationModal({ email, onVerified, onClose, api }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-verification-otp', { email });
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-email', { email, otp });
      onVerified();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📧 Verify Your Email</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--text2)' }}>
            Please verify your email address: <strong>{email}</strong>
          </p>
          
          {error && (
            <div style={{ background: 'rgba(255,77,109,.12)', border: '1px solid rgba(255,77,109,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          
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
          
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleSendOTP}
              disabled={resendDisabled || loading}
              style={{ flex: 1 }}
            >
              {resendDisabled ? `Resend in ${countdown}s` : 'Send OTP'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleVerify}
              disabled={loading || !otp}
              style={{ flex: 1 }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}