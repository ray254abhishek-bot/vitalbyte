// ─── Doctors.js ───────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

export function Doctors() {
  const { api } = useAuth();
  const { isOnline } = useSocket();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [spec,    setSpec]    = useState('');

  useEffect(() => {
    api.get('/doctors').then(r => setDoctors(r.data)).finally(() => setLoading(false));
  // eslint-disable-next-line
  }, []);

  const specs = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];
  const filtered = doctors.filter(d =>
    (!search || d.name.toLowerCase().includes(search.toLowerCase())) &&
    (!spec   || d.specialization === spec)
  );

  return (
    <div>
      <div className="page-header">
        <div><h1>Doctors</h1><p>{filtered.length} of {doctors.length} doctors</p></div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <span>🔍</span>
          <input placeholder="Search doctors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 200 }} value={spec} onChange={e => setSpec(e.target.value)}>
          <option value="">All Specializations</option>
          {specs.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="loader"><div className="spinner"/></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="icon">👨‍⚕️</div><h3>No doctors found</h3>
            </div>
          ) : filtered.map(d => (
            <div key={d._id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                <div className="avatar lg" style={{ position: 'relative' }}>
                  {d.name[0]}
                  <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: isOnline(d._id) ? 'var(--success)' : 'var(--muted)', border: '2px solid var(--surface)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Dr. {d.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--accent)', marginTop: 2 }}>{d.specialization || 'General'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{d.hospital?.name || 'Independent'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                {d.phone && <div style={{ color: 'var(--text2)' }}>📞 {d.phone}</div>}
                {d.email && <div style={{ color: 'var(--text2)' }}>✉️ {d.email}</div>}
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigate('/appointments')}>
                  📅 Book
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/chat')}>💬</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Patients.js ──────────────────────────────────────────────────────────────
export function Patients() {
  const { api } = useAuth();
  const { isOnline } = useSocket();
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/patients').then(r => setPatients(r.data)).finally(() => setLoading(false));
  // eslint-disable-next-line
  }, []);

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div><h1>Patients</h1><p>{filtered.length} patients</p></div>
      </div>

      <div className="search-box" style={{ maxWidth: 380, marginBottom: 20 }}>
        <span>🔍</span>
        <input placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="loader"><div className="spinner"/></div> : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Patient</th><th>Age / Gender</th><th>Blood Group</th><th>Contact</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar sm">{p.name[0]}</div>
                      <strong>{p.name}</strong>
                    </div>
                  </td>
                  <td>{p.age} / {p.gender}</td>
                  <td>{p.blood_group ? <span className="badge badge-danger">{p.blood_group}</span> : '—'}</td>
                  <td>{p.phone || '—'}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      <div className={isOnline(p._id) ? 'online-dot' : 'offline-dot'} />
                      {isOnline(p._id) ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(p)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <PatientModal p={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PatientModal({ p, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Patient Profile</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div className="avatar lg">{p.name[0]}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{p.email}</div>
              {p.blood_group && <span className="badge badge-danger" style={{ marginTop: 6 }}>{p.blood_group}</span>}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['Age', p.age],['Gender', p.gender],['Phone', p.phone],['Address', p.address],['Aadhar Verified', p.aadhar_verified ? '✅ Yes' : '❌ No']].map(([l, v]) => (
              v && <div key={l}><div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>{l}</div><div>{v}</div></div>
            ))}
          </div>
          {p.allergies?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Allergies</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {p.allergies.map((a, i) => <span key={i} className="badge badge-danger">{a}</span>)}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer"><button className="btn btn-outline" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

// ─── Hospitals.js ─────────────────────────────────────────────────────────────
export function Hospitals() {
  const { api } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem,  setEditItem]  = useState(null);

  const load = () => api.get('/hospitals').then(r => setHospitals(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const remove = async (id) => {
    if (window.confirm('Deactivate this hospital?')) { await api.delete(`/hospitals/${id}`); load(); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Hospitals</h1><p>{hospitals.length} registered hospitals</p></div>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>+ Add Hospital</button>
      </div>

      {loading ? <div className="loader"><div className="spinner"/></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {hospitals.map(h => (
            <div key={h._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontSize: 32 }}>🏨</div>
                <span className={`badge ${h.type === 'government' ? 'badge-success' : h.type === 'private' ? 'badge-info' : 'badge-warning'}`}>{h.type}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{h.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>📍 {h.address}</div>
              {h.phone && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>📞 {h.phone}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditItem(h); setShowModal(true); }}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(h._id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <HospitalModal item={editItem} onClose={() => setShowModal(false)} onSaved={load} api={api} />
      )}
    </div>
  );
}

function HospitalModal({ item, onClose, onSaved, api }) {
  const [form, setForm] = useState({ name: item?.name || '', address: item?.address || '', phone: item?.phone || '', email: item?.email || '', type: item?.type || 'private' });
  const [loading, setLoading] = useState(false);
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      item ? await api.put(`/hospitals/${item._id}`, form) : await api.post('/hospitals', form);
      onSaved(); onClose();
    } finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{item ? 'Edit' : 'Add'} Hospital</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Hospital Name</label><input className="form-input" name="name" value={form.name} onChange={handle} required /></div>
            <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" name="address" value={form.address} onChange={handle} required /></div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" name="phone" value={form.phone} onChange={handle} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" name="email" value={form.email} onChange={handle} /></div>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" name="type" value={form.type} onChange={handle}>
                <option>government</option><option>private</option><option>clinic</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Doctors;
