import React, { useState } from 'react';

const CATEGORIES = [
  { value: 'technical', label: '💻 Technical Issue', icon: '💻' },
  { value: 'medical', label: '🏥 Medical Concern', icon: '🏥' },
  { value: 'billing', label: '💰 Billing Issue', icon: '💰' },
  { value: 'staff', label: '👥 Staff Behavior', icon: '👥' },
  { value: 'suggestion', label: '💡 Suggestion', icon: '💡' },
  { value: 'other', label: '📝 Other', icon: '📝' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'badge-info' },
  { value: 'medium', label: 'Medium', color: 'badge-warning' },
  { value: 'high', label: 'High', color: 'badge-danger' },
  { value: 'urgent', label: 'Urgent', color: 'badge-purple' },
];

export default function ComplaintModal({ onClose, onSubmit, api }) {
  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'other',
    priority: 'medium',
    is_anonymous: false,
  });
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    if (!form.description.trim()) {
      setError('Please describe your complaint');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const fd = new FormData();
      fd.append('subject', form.subject);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('priority', form.priority);
      fd.append('is_anonymous', form.is_anonymous);
      attachments.forEach(f => fd.append('attachments', f));
      
      await api.post('/complaints', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSuccess('Complaint submitted successfully!');
      setTimeout(() => {
        if (onSubmit) onSubmit();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 File a Complaint</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={submit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
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
            
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <input
                className="form-input"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                placeholder="Brief summary of your issue"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Category</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`btn btn-sm ${form.category === cat.value ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Priority</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PRIORITIES.map(pri => (
                  <button
                    key={pri.value}
                    type="button"
                    className={`btn btn-sm ${form.priority === pri.value ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setForm(f => ({ ...f, priority: pri.value }))}
                  >
                    {pri.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className="form-textarea"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Please provide detailed information about your complaint..."
                rows={5}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Attachments (optional)</label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={e => setAttachments(Array.from(e.target.files))}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', width: '100%', color: 'var(--text)', fontSize: 13 }}
              />
              {attachments.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>
                  {attachments.length} file(s) selected
                </div>
              )}
            </div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 8 }}>
              <input
                type="checkbox"
                name="is_anonymous"
                checked={form.is_anonymous}
                onChange={handleChange}
              />
              Submit anonymously (your name will not be shared with other users)
            </label>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}