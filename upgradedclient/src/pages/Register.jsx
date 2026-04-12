import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const { register, error, setError, api } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'patient', age: '', gender: '', blood_group: '',
    phone: '', address: '', allergies: '',
    specialization: '', license_number: '', registration_number: '', hospital: '',
  });

  useEffect(() => {
    api.get('/hospitals').then(r => setHospitals(r.data)).catch(() => { });
    // eslint-disable-next-line
  }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try {
      const payload = {
        ...form,
        hospital: form.hospital || null, // Convert empty string to null
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()) : []
      };
      delete payload.confirmPassword;
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
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

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 99,
              background: s <= step ? 'var(--accent)' : 'var(--border)',
              transition: 'background .3s',
            }} />
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(255,77,109,.12)', border: '1px solid rgba(255,77,109,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          {step === 1 && (
            <>
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
                <input className="form-input" name="name" value={form.name} onChange={handle} placeholder="Dr. John Smith" required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" name="email" value={form.email} onChange={handle} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" name="phone" value={form.phone} onChange={handle} placeholder="+91..." />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" name="password" value={form.password} onChange={handle} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input className="form-input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handle} required />
                </div>
              </div>

              <button type="button" className="btn btn-primary w-full" onClick={() => { setError(''); setStep(2); }}>
                Next →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input className="form-input" type="number" name="age" value={form.age} onChange={handle} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" name="gender" value={form.gender} onChange={handle}>
                    <option value="">Select</option>
                    <option>male</option><option>female</option><option>other</option>
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select className="form-select" name="blood_group" value={form.blood_group} onChange={handle}>
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" name="address" value={form.address} onChange={handle} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Allergies (comma separated)</label>
                <input className="form-input" name="allergies" value={form.allergies} onChange={handle} placeholder="Penicillin, Peanuts..." />
              </div>

              {form.role === 'doctor' && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Doctor Details</div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Specialization</label>
                      <input className="form-input" name="specialization" value={form.specialization} onChange={handle} placeholder="Cardiology" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Hospital</label>
                      <select className="form-select" name="hospital" value={form.hospital} onChange={handle}>
                        <option value="">Select Hospital</option>
                        {hospitals.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">License Number</label>
                      <input className="form-input" name="license_number" value={form.license_number} onChange={handle} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Registration Number</label>
                      <input className="form-input" name="registration_number" value={form.registration_number} onChange={handle} />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? '⏳ Creating…' : '✓ Create Account'}
                </button>
              </div>
            </>
          )}
        </form>

        <div className="auth-footer">
          Already have an account? <span onClick={() => navigate('/login')}>Sign in</span>
        </div>
      </div>
    </div>
  );
}
