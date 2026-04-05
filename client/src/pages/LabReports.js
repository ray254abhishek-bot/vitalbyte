import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { format } from 'date-fns';

export function LabReports() {
  const { user, api } = useAuth();
  const { socket }    = useSocket();
  const [reports,  setReports]  = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors,  setDoctors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(() => {
    api.get('/lab-reports').then(r => setReports(r.data)).finally(() => setLoading(false));
  // eslint-disable-next-line
  }, []);

  useEffect(() => {
    load();
    // Only load patients and doctors for roles that can upload (doctor, admin, lab_technician)
    const canUpload = ['doctor', 'admin', 'lab_technician'].includes(user?.role);
    if (canUpload) {
      api.get('/patients').then(r => setPatients(r.data)).catch(() => {});
      api.get('/doctors').then(r => setDoctors(r.data)).catch(() => {});
    }
    if (!socket) return;
    socket.on('lab_report_update', load);
    return () => socket.off('lab_report_update', load);
  // eslint-disable-next-line
  }, [socket]);

  const updateStatus = async (id, status, results) => {
    await api.put(`/lab-reports/${id}/status`, { status, results });
    load();
  };

  const STATUS_BADGE = { pending: 'badge-warning', processing: 'badge-info', completed: 'badge-success' };
  
  // Check if user can upload lab reports
  const canUpload = user?.role === 'doctor' || user?.role === 'admin' || user?.role === 'lab_technician';

  // Function to handle file viewing
  const handleViewFile = (fileUrl) => {
    // Construct full URL
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const fullUrl = `${baseUrl}${fileUrl}`;
    window.open(fullUrl, '_blank');
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Lab Reports</h1><p>{reports.length} total reports</p></div>
        {/* Only show upload button for doctors, admins, and lab technicians */}
        {canUpload && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Upload Report</button>
        )}
      </div>

      {loading ? <div className="loader"><div className="spinner"/></div> : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Patient</th>
                  <th>Referred By</th>
                  <th>Test</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No lab reports yet</td></tr>
                ) : reports.map(r => (
                  <tr key={r._id}>
                    <td><code style={{ fontSize: 12, color: 'var(--accent)' }}>{r.record_id}</code></td>
                    <td><strong>{r.patient_id?.name}</strong><div style={{ fontSize: 11, color: 'var(--muted)' }}>Age: {r.patient_id?.age}</div></td>
                    <td>{r.referred_by ? `Dr. ${r.referred_by?.name}` : <span className="text-muted">Self</span>}</td>
                    <td>{r.test_name || <span className="text-muted">—</span>}</td>
                    <td>{r.uploaded_at ? format(new Date(r.uploaded_at), 'MMM d, yyyy') : '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {r.upload_files && r.upload_files.length > 0 ? (
                          r.upload_files.map((file, idx) => (
                            <button 
                              key={idx}
                              className="btn btn-ghost btn-sm" 
                              onClick={() => handleViewFile(file)}
                            >
                              📄 View {r.upload_files.length > 1 ? `File ${idx + 1}` : 'Report'}
                            </button>
                          ))
                        ) : (
                          <span className="text-muted">No files</span>
                        )}
                        {/* Doctors, admins, and lab technicians can mark reports as completed */}
                        {(user?.role === 'doctor' || user?.role === 'admin' || user?.role === 'lab_technician') && r.status !== 'completed' && (
                          <button className="btn btn-success btn-sm" onClick={() => updateStatus(r._id, 'completed', '')}>Mark Done</button>
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

      {/* Only show upload modal for users who can upload */}
      {showModal && canUpload && (
        <UploadModal patients={patients} doctors={doctors} user={user} onClose={() => setShowModal(false)} onUploaded={load} api={api} />
      )}
    </div>
  );
}

function UploadModal({ patients, doctors, user, onClose, onUploaded, api }) {
  const [form, setForm] = useState({ 
    patient_id: '', 
    referred_by: '', 
    test_name: '', 
    test_type: '', 
    notes: '' 
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.patient_id) {
      setError('Please select a patient');
      return;
    }
    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      files.forEach(f => fd.append('files', f));
      await api.post('/lab-reports', fd, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      onUploaded(); 
      onClose();
    } catch (err) { 
      setError(err.response?.data?.message || 'Failed to upload report');
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🧪 Upload Lab Report</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: 'rgba(255,77,109,.12)', border: '1px solid rgba(255,77,109,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Patient *</label>
              <select className="form-select" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} required>
                <option value="">Select Patient</option>
                {patients.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Referred By (Doctor)</label>
              <select className="form-select" value={form.referred_by} onChange={e => setForm(f => ({ ...f, referred_by: e.target.value }))}>
                <option value="">Self / Walk-in</option>
                {doctors.map(d => <option key={d._id} value={d._id}>Dr. {d.name} — {d.specialization}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Test Name</label>
                <input className="form-input" value={form.test_name} onChange={e => setForm(f => ({ ...f, test_name: e.target.value }))} placeholder="Complete Blood Count" />
              </div>
              <div className="form-group">
                <label className="form-label">Test Type</label>
                <input className="form-input" value={form.test_type} onChange={e => setForm(f => ({ ...f, test_type: e.target.value }))} placeholder="Blood / Urine / X-Ray..." />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Upload Files (PDF / Images) *</label>
              <input 
                type="file" 
                multiple 
                accept=".pdf,.jpg,.jpeg,.png" 
                onChange={e => setFiles(Array.from(e.target.files))}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', width: '100%', color: 'var(--text)', fontSize: 13 }} 
                required
              />
              {files.length > 0 && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>{files.length} file(s) selected</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Uploading…' : 'Upload Report'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LabReports;