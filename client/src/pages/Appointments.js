import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { format } from 'date-fns';

const STATUS_BADGE = { pending:'badge-warning', confirmed:'badge-info', completed:'badge-success', cancelled:'badge-danger', rescheduled:'badge-purple' };
const TYPE_BADGE   = { 'in-person':'badge-info', online:'badge-success' };

export default function Appointments() {
  const { user, api }  = useAuth();
  const { socket }     = useSocket();
  const [appts,  setAppts]   = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [detailAppt, setDetailAppt] = useState(null);

  const load = useCallback(() => {
    api.get('/appointments').then(r => setAppts(r.data)).finally(() => setLoading(false));
  // eslint-disable-next-line
  }, []);

  useEffect(() => {
    load();
    if (user.role !== 'admin') api.get('/doctors').then(r => setDoctors(r.data));

    if (!socket) return;
    socket.on('appointment_update', load);
    socket.on('appointment_deleted', load);
    return () => { socket.off('appointment_update', load); socket.off('appointment_deleted', load); };
  // eslint-disable-next-line
  }, [socket]);

  const updateStatus = async (id, status) => {
    await api.put(`/appointments/${id}/status`, { status });
    load();
    setDetailAppt(null);
  };

  const deleteAppt = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    await api.delete(`/appointments/${id}`);
    load();
  };

  const filtered = filter === 'all' ? appts : appts.filter(a => a.status === filter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Appointments</h1>
          <p>{appts.length} total • {appts.filter(a => a.status === 'pending').length} pending</p>
        </div>
        {user.role === 'patient' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Book Appointment</button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all','pending','confirmed','completed','cancelled'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ textTransform: 'capitalize' }} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📅</div>
          <h3>No appointments</h3>
          <p>{user.role === 'patient' ? 'Book your first appointment with a doctor.' : 'No appointments found.'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{user.role === 'patient' ? 'Doctor' : 'Patient'}</th>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar sm">
                          {user.role === 'patient'
                            ? a.doctor_id?.name?.[0]
                            : a.patient_id?.name?.[0]}
                        </div>
                        <div>
                          <strong>
                            {user.role === 'patient'
                              ? `Dr. ${a.doctor_id?.name}`
                              : a.patient_id?.name}
                          </strong>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {user.role === 'patient' ? a.doctor_id?.specialization : `Age: ${a.patient_id?.age}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{a.date ? format(new Date(a.date), 'MMM d, yyyy') : '—'}</strong>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.time}</div>
                    </td>
                    <td><span className={`badge ${TYPE_BADGE[a.type]}`}>{a.type}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[a.status]}`}>{a.status}</span></td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.remarks || <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDetailAppt(a)}>View</button>
                        {user.role === 'doctor' && a.status === 'pending' && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => updateStatus(a._id, 'confirmed')}>✓</button>
                            <button className="btn btn-danger btn-sm"  onClick={() => updateStatus(a._id, 'cancelled')}>✗</button>
                          </>
                        )}
                        {user.role === 'doctor' && a.status === 'confirmed' && (
                          <button className="btn btn-primary btn-sm" onClick={() => updateStatus(a._id, 'completed')}>Complete</button>
                        )}
                        {user.role === 'patient' && ['pending','confirmed'].includes(a.status) && (
                          <button className="btn btn-danger btn-sm" onClick={() => deleteAppt(a._id)}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <BookModal doctors={doctors} onClose={() => setShowModal(false)} onBooked={load} api={api} user={user} />
      )}

      {detailAppt && (
        <DetailModal appt={detailAppt} user={user} onClose={() => setDetailAppt(null)} onStatus={updateStatus} />
      )}
    </div>
  );
}

function BookModal({ doctors, onClose, onBooked, api, user }) {
  const [form, setForm] = useState({ doctor_id: '', date: '', time: '', remarks: '', type: 'in-person' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/appointments', form);
      onBooked(); onClose();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📅 Book Appointment</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Select Doctor</label>
              <select className="form-select" name="doctor_id" value={form.doctor_id} onChange={handle} required>
                <option value="">Choose a doctor</option>
                {doctors.map(d => <option key={d._id} value={d._id}>Dr. {d.name} — {d.specialization}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" name="date" value={form.date} onChange={handle} min={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input className="form-input" type="time" name="time" value={form.time} onChange={handle} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['in-person', 'online'].map(t => (
                  <button key={t} type="button" className={`btn btn-sm ${form.type === t ? 'btn-primary' : 'btn-outline'}`}
                    style={{ textTransform: 'capitalize' }} onClick={() => setForm(f => ({ ...f, type: t }))}>{t}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Remarks / Symptoms</label>
              <textarea className="form-textarea" name="remarks" value={form.remarks} onChange={handle} placeholder="Describe your symptoms..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Booking…' : 'Book Appointment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailModal({ appt, user, onClose, onStatus }) {
  const d = appt.doctor_id;
  const p = appt.patient_id;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Appointment Details</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Info label="Patient"     value={p?.name} />
            <Info label="Doctor"      value={`Dr. ${d?.name}`} />
            <Info label="Date"        value={appt.date ? format(new Date(appt.date), 'MMMM d, yyyy') : '—'} />
            <Info label="Time"        value={appt.time} />
            <Info label="Type"        value={appt.type} />
            <Info label="Status"      value={<span className={`badge ${STATUS_BADGE[appt.status]}`}>{appt.status}</span>} />
          </div>
          {appt.remarks && <Info label="Remarks" value={appt.remarks} style={{ marginTop: 14 }} />}
          {appt.notes   && <Info label="Doctor Notes" value={appt.notes} style={{ marginTop: 8 }} />}
        </div>
        <div className="modal-footer">
          {user.role === 'doctor' && appt.status === 'pending' && (
            <>
              <button className="btn btn-success" onClick={() => onStatus(appt._id, 'confirmed')}>✓ Confirm</button>
              <button className="btn btn-danger"  onClick={() => onStatus(appt._id, 'cancelled')}>✗ Cancel</button>
            </>
          )}
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const Info = ({ label, value, style }) => (
  <div style={style}>
    <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 14 }}>{value || '—'}</div>
  </div>
);
