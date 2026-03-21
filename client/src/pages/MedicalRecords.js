import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { format } from 'date-fns';

export default function MedicalRecords() {
  const { user, api } = useAuth();
  const { socket }    = useSocket();
  const [records,  setRecords]  = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    api.get('/medical-records').then(r => setRecords(r.data)).finally(() => setLoading(false));
  // eslint-disable-next-line
  }, []);

  useEffect(() => {
    load();
    if (user.role === 'doctor') api.get('/patients').then(r => setPatients(r.data));
    if (!socket) return;
    socket.on('record_added', load);
    return () => socket.off('record_added', load);
  // eslint-disable-next-line
  }, [socket]);

  const filtered = records.filter(r =>
    r.patient_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.diagnosis?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Medical Records</h1>
          <p>{records.length} records found</p>
        </div>
        {user.role === 'doctor' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Record</button>
        )}
      </div>

      {/* Search */}
      <div className="search-box" style={{ maxWidth: 380, marginBottom: 20 }}>
        <span>🔍</span>
        <input placeholder="Search by patient name or diagnosis..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <h3>No records found</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(r => (
            <div key={r._id} className="card" style={{ cursor: 'pointer', padding: '18px 20px' }} onClick={() => setSelected(r)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div className="avatar" style={{ width: 44, height: 44, fontSize: 18 }}>
                    {r.patient_id?.name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{r.patient_id?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      By Dr. {r.doctor_id?.name} • {r.date ? format(new Date(r.date), 'MMM d, yyyy') : '—'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {r.is_emergency && <span className="badge badge-danger" style={{ marginBottom: 6 }}>Emergency</span>}
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.prescriptions?.length || 0} prescriptions</div>
                </div>
              </div>

              {r.diagnosis && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5 }}>Diagnosis</div>
                  <div style={{ fontSize: 13, marginTop: 3 }}>{r.diagnosis}</div>
                </div>
              )}

              {r.vital_signs && Object.values(r.vital_signs).some(Boolean) && (
                <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  {r.vital_signs.blood_pressure  && <Vital icon="❤️"  label="BP"    value={r.vital_signs.blood_pressure} />}
                  {r.vital_signs.pulse           && <Vital icon="💓"  label="Pulse" value={r.vital_signs.pulse} />}
                  {r.vital_signs.temperature     && <Vital icon="🌡️" label="Temp"  value={r.vital_signs.temperature} />}
                  {r.vital_signs.oxygen_level    && <Vital icon="💨"  label="SpO₂"  value={r.vital_signs.oxygen_level} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddRecordModal patients={patients} onClose={() => setShowModal(false)} onAdded={load} api={api} />
      )}

      {selected && (
        <RecordDetailModal record={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

const Vital = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--surface3)', borderRadius: 8, fontSize: 12 }}>
    <span>{icon}</span>
    <span style={{ color: 'var(--muted)' }}>{label}:</span>
    <span style={{ fontWeight: 500 }}>{value}</span>
  </div>
);

function AddRecordModal({ patients, onClose, onAdded, api }) {
  const [form, setForm] = useState({
    patient_id: '', date: new Date().toISOString().split('T')[0],
    diagnosis: '', symptoms: '', other_records: '', is_emergency: false,
    vital_signs: { blood_pressure: '', pulse: '', temperature: '', weight: '', height: '', oxygen_level: '' },
    prescriptions: [{ medicine: '', dosage: '', frequency: '', duration: '', notes: '' }],
  });
  const [loading, setLoading] = useState(false);

  const handleVital = e => setForm(f => ({ ...f, vital_signs: { ...f.vital_signs, [e.target.name]: e.target.value } }));
  const handleRx = (i, e) => setForm(f => {
    const p = [...f.prescriptions];
    p[i] = { ...p[i], [e.target.name]: e.target.value };
    return { ...f, prescriptions: p };
  });
  const addRx = () => setForm(f => ({ ...f, prescriptions: [...f.prescriptions, { medicine: '', dosage: '', frequency: '', duration: '', notes: '' }] }));
  const removeRx = i => setForm(f => ({ ...f, prescriptions: f.prescriptions.filter((_, idx) => idx !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, symptoms: form.symptoms.split(',').map(s => s.trim()).filter(Boolean) };
      await api.post('/medical-records', payload);
      onAdded(); onClose();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Add Medical Record</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Patient</label>
                <select className="form-select" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} required>
                  <option value="">Select Patient</option>
                  {patients.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Diagnosis</label>
              <input className="form-input" value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="Primary diagnosis..." />
            </div>

            <div className="form-group">
              <label className="form-label">Symptoms (comma separated)</label>
              <input className="form-input" value={form.symptoms} onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))} placeholder="Fever, Headache, Cough..." />
            </div>

            {/* Vital Signs */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Vital Signs</div>
              <div className="form-grid-3">
                {[['blood_pressure','BP (mmHg)'],['pulse','Pulse (bpm)'],['temperature','Temp (°C)'],['weight','Weight (kg)'],['height','Height (cm)'],['oxygen_level','SpO₂ (%)']].map(([k, label]) => (
                  <div className="form-group" key={k} style={{ marginBottom: 8 }}>
                    <label className="form-label">{label}</label>
                    <input className="form-input" name={k} value={form.vital_signs[k]} onChange={handleVital} />
                  </div>
                ))}
              </div>
            </div>

            {/* Prescriptions */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Prescriptions</div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={addRx}>+ Add</button>
              </div>
              {form.prescriptions.map((rx, i) => (
                <div key={i} style={{ padding: 12, background: 'var(--surface2)', borderRadius: 10, marginBottom: 10, position: 'relative' }}>
                  {form.prescriptions.length > 1 && (
                    <button type="button" style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14 }} onClick={() => removeRx(i)}>✕</button>
                  )}
                  <div className="form-grid">
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Medicine</label>
                      <input className="form-input" name="medicine" value={rx.medicine} onChange={e => handleRx(i, e)} placeholder="Paracetamol 500mg" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Dosage</label>
                      <input className="form-input" name="dosage" value={rx.dosage} onChange={e => handleRx(i, e)} placeholder="1 tablet" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Frequency</label>
                      <input className="form-input" name="frequency" value={rx.frequency} onChange={e => handleRx(i, e)} placeholder="3x daily" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Duration</label>
                      <input className="form-input" name="duration" value={rx.duration} onChange={e => handleRx(i, e)} placeholder="5 days" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <textarea className="form-textarea" value={form.other_records} onChange={e => setForm(f => ({ ...f, other_records: e.target.value }))} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.is_emergency} onChange={e => setForm(f => ({ ...f, is_emergency: e.target.checked }))} />
              Mark as Emergency Record
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save Record'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordDetailModal({ record: r, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Medical Record</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Info label="Patient"  value={r.patient_id?.name} />
            <Info label="Doctor"   value={`Dr. ${r.doctor_id?.name}`} />
            <Info label="Date"     value={r.date ? format(new Date(r.date), 'MMMM d, yyyy') : '—'} />
            <Info label="Diagnosis" value={r.diagnosis} />
          </div>

          {r.symptoms?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Symptoms</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {r.symptoms.map((s, i) => <span key={i} className="badge badge-info">{s}</span>)}
              </div>
            </div>
          )}

          {r.prescriptions?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Prescriptions</div>
              {r.prescriptions.map((rx, i) => (
                <div key={i} style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 8 }}>
                  <strong>{rx.medicine}</strong>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    {rx.dosage} • {rx.frequency} • {rx.duration}
                  </div>
                </div>
              ))}
            </div>
          )}

          {r.other_records && <Info label="Notes" value={r.other_records} />}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const Info = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13 }}>{value || '—'}</div>
  </div>
);
