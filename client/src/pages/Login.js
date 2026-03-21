import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login, error, setError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demo = (role) => {
    const creds = {
      admin:   { email: 'admin@vitalbyte.com',   password: 'admin123' },
      doctor:  { email: 'doctor@vitalbyte.com',  password: 'doctor123' },
      patient: { email: 'patient@vitalbyte.com', password: 'patient123' },
    };
    setForm(creds[role]);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: 40, marginBottom: 8 }}>💊</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800 }}>VitalByte</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>DIGITAL HEALTH RECORDS</div>
        </div>

        <div className="auth-title">Welcome back</div>
        <div className="auth-sub">Sign in to your account to continue</div>

        {error && (
          <div style={{ background: 'rgba(255,77,109,.12)', border: '1px solid rgba(255,77,109,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" name="email" value={form.email} onChange={handle} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" name="password" value={form.password} onChange={handle} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary w-full" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? '⏳ Signing in…' : '→ Sign In'}
          </button>
        </form>

        {/* Demo logins */}
        <div style={{ marginTop: 20, padding: '14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Quick Demo Login</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['admin', 'doctor', 'patient'].map(r => (
              <button key={r} className="btn btn-ghost btn-sm" style={{ flex: 1, textTransform: 'capitalize' }} onClick={() => demo(r)}>{r}</button>
            ))}
          </div>
        </div>

        <div className="auth-footer">
          Don't have an account? <span onClick={() => navigate('/register')}>Register here</span>
        </div>
      </div>
    </div>
  );
}
