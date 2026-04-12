// ─── Profile.js ───────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function Profile() {
  const { user, api, updateUser } = useAuth();
  const [form,    setForm]    = useState({ ...user });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState('profile');
  const [pwForm,  setPwForm]  = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault(); setLoading(true); setSuccess(''); setError('');
    try {
      const { data } = await api.put(`/users/${user._id}`, form);
      updateUser(data);
      setSuccess('Profile updated successfully!');
    } catch { setError('Failed to update profile'); }
    finally { setLoading(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return setError('Passwords do not match');
    setLoading(true); setSuccess(''); setError('');
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setSuccess('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div><h1>My Profile</h1><p>Manage your account information</p></div>
      </div>

      {/* Profile Header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div className="avatar" style={{ width: 72, height: 72, fontSize: 28 }}>{initials}</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 13, color: 'var(--accent)', marginTop: 2, textTransform: 'capitalize' }}>{user.role}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{user.email}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {user.aadhar_verified ? <span className="badge badge-success">✓ Aadhar Verified</span> : <span className="badge badge-warning">Aadhar Pending</span>}
          <span className={`badge ${user.authStatus === 'verified' ? 'badge-success' : 'badge-warning'}`}>{user.authStatus}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {['profile','security'].map(t => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
            style={{ textTransform: 'capitalize' }} onClick={() => { setTab(t); setSuccess(''); setError(''); }}>
            {t === 'profile' ? '👤 Profile' : '🔐 Security'}
          </button>
        ))}
      </div>

      {success && <div style={{ background: 'rgba(0,230,138,.12)', border: '1px solid rgba(0,230,138,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--success)' }}>{success}</div>}
      {error   && <div style={{ background: 'rgba(255,77,109,.12)', border: '1px solid rgba(255,77,109,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>{error}</div>}

      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="card">
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" name="name" value={form.name || ''} onChange={handle} /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" name="phone" value={form.phone || ''} onChange={handle} /></div>
            <div className="form-group"><label className="form-label">Age</label><input className="form-input" type="number" name="age" value={form.age || ''} onChange={handle} /></div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" name="gender" value={form.gender || ''} onChange={handle}>
                <option value="">Select</option><option>male</option><option>female</option><option>other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select className="form-select" name="blood_group" value={form.blood_group || ''} onChange={handle}>
                <option value="">Select</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Aadhar Number</label><input className="form-input" name="aadhar_number" value={form.aadhar_number || ''} onChange={handle} /></div>
          </div>
          <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" name="address" value={form.address || ''} onChange={handle} /></div>
          {user.role === 'doctor' && (
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Specialization</label><input className="form-input" name="specialization" value={form.specialization || ''} onChange={handle} /></div>
              <div className="form-group"><label className="form-label">License Number</label><input className="form-input" name="license_number" value={form.license_number || ''} onChange={handle} /></div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      )}

      {tab === 'security' && (
        <form onSubmit={changePassword} className="card">
          <div style={{ marginBottom: 16, fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700 }}>Change Password</div>
          <div className="form-group"><label className="form-label">Current Password</label><input className="form-input" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required /></div>
          <div className="form-group"><label className="form-label">New Password</label><input className="form-input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required /></div>
          <div className="form-group"><label className="form-label">Confirm Password</label><input className="form-input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Updating…' : 'Update Password'}</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── AdminUsers.js ────────────────────────────────────────────────────────────
export function AdminUsers() {
  const { api } = useAuth();
  const [users,   setUsers]   = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter,  setFilter]  = React.useState('all');
  const [search,  setSearch]  = React.useState('');

  const load = () => api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const verify = async (id, status) => {
    await api.put(`/users/${id}/verify`, { status }); load();
  };

  const filtered = users.filter(u =>
    (filter === 'all' || u.role === filter) &&
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const ROLE_BADGE = { patient: 'badge-info', doctor: 'badge-success', admin: 'badge-purple', lab_technician: 'badge-warning' };

  return (
    <div>
      <div className="page-header">
        <div><h1>User Management</h1><p>{users.length} total users</p></div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="search-box" style={{ flex: 1 }}>
          <span>🔍</span><input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {['all','patient','doctor','admin'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ textTransform: 'capitalize' }} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {loading ? <div className="loader"><div className="spinner"/></div> : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>User</th><th>Role</th><th>Contact</th><th>Verification</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar sm">{u.name[0]}</div>
                      <div><strong>{u.name}</strong><div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</div></div>
                    </div>
                  </td>
                  <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-info'}`}>{u.role}</span></td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${u.authStatus === 'verified' ? 'badge-success' : u.authStatus === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                      {u.authStatus || 'pending'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(!u.authStatus || u.authStatus === 'pending') && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => verify(u._id, 'verified')}>✓ Verify</button>
                          <button className="btn btn-danger btn-sm"  onClick={() => verify(u._id, 'rejected')}>✗ Reject</button>
                        </>
                      )}
                      {u.authStatus === 'verified' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => verify(u._id, 'pending')}>Revoke</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Profile;
