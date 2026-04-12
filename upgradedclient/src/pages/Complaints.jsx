import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const STATUS_BADGE = {
  pending: 'badge-warning',
  in_review: 'badge-info',
  resolved: 'badge-success',
  rejected: 'badge-danger',
};

const PRIORITY_BADGE = {
  low: 'badge-info',
  medium: 'badge-warning',
  high: 'badge-danger',
  urgent: 'badge-purple',
};

const CATEGORY_ICON = {
  technical: '💻',
  medical: '🏥',
  billing: '💰',
  staff: '👥',
  suggestion: '💡',
  other: '📝',
};

export default function Complaints() {
  const { user, api, loading: authLoading } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Wait for auth to load
  useEffect(() => {
    if (!authLoading && user) {
      loadComplaints();
      if (user.role === 'admin') {
        loadStats();
      }
    }
    // eslint-disable-next-line
  }, [authLoading, user]);

  const loadComplaints = async () => {
    try {
      const res = await api.get('/complaints');
      setComplaints(res.data);
    } catch (err) {
      console.error('Failed to load complaints', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/complaints/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  const updateStatus = async (id, status, response) => {
    try {
      await api.put(`/complaints/${id}/status`, { status, admin_response: response });
      loadComplaints();
      loadStats();
      setSelectedComplaint(null);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Show loading while auth is loading
  if (authLoading || !user) {
    return (
      <div className="loader">
        <div className="spinner"/>
      </div>
    );
  }

  const filteredComplaints = complaints.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (filter !== 'all' && c.category !== filter) return false;
    return true;
  });

  const categories = [...new Set(complaints.map(c => c.category))];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Complaints & Feedback</h1>
          <p>Track and manage your reported issues</p>
        </div>
      </div>

      {/* Admin Stats Dashboard */}
      {user.role === 'admin' && stats && (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Complaints</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{stats.pending + stats.inReview}</div>
            <div className="stat-label">Open Complaints</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.resolved}</div>
            <div className="stat-label">Resolved</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🚨</div>
            <div className="stat-value">{stats.byPriority?.urgent || 0}</div>
            <div className="stat-label">Urgent Issues</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
        
        {user.role === 'admin' && (
          <select className="form-select" style={{ width: 150 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"/></div>
      ) : filteredComplaints.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📝</div>
          <h3>No complaints found</h3>
          <p>Click the button below to report an issue</p>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              // Find and click the complaint button in the header
              const complaintBtn = document.querySelector('.icon-btn[title="File a complaint"]');
              if (complaintBtn) complaintBtn.click();
            }}
          >
            + File a Complaint
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {user.role === 'admin' && <th>User</th>}
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map(c => (
                  <tr key={c._id}>
                    {user.role === 'admin' && (
                      <td>
                        {c.is_anonymous ? (
                          <span className="text-muted">Anonymous</span>
                        ) : (
                          <div>
                            <strong>{c.user_name}</strong>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.user_role}</div>
                          </div>
                        )}
                      </td>
                    )}
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.subject}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {c.description.length > 60 ? c.description.slice(0, 60) + '...' : c.description}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 16 }}>{CATEGORY_ICON[c.category]}</span>{' '}
                      <span style={{ fontSize: 12 }}>{c.category}</span>
                    </td>
                    <td>
                      <span className={`badge ${PRIORITY_BADGE[c.priority]}`}>{c.priority}</span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[c.status]}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {format(new Date(c.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedComplaint(c)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          user={user}
          onClose={() => setSelectedComplaint(null)}
          onUpdate={updateStatus}
        />
      )}
    </div>
  );
}

function ComplaintDetailModal({ complaint, user, onClose, onUpdate }) {
  const [response, setResponse] = useState(complaint.admin_response || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (status) => {
    setIsUpdating(true);
    await onUpdate(complaint._id, status, response);
    setIsUpdating(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Complaint Details</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Subject</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{complaint.subject}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Category</div>
              <div>{CATEGORY_ICON[complaint.category]} {complaint.category}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Priority</div>
              <span className={`badge ${PRIORITY_BADGE[complaint.priority]}`}>{complaint.priority}</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
              <span className={`badge ${STATUS_BADGE[complaint.status]}`}>{complaint.status.replace('_', ' ')}</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Submitted</div>
              <div style={{ fontSize: 13 }}>{format(new Date(complaint.createdAt), 'MMMM d, yyyy h:mm a')}</div>
            </div>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8 }}>
              {complaint.description}
            </div>
          </div>
          
          {complaint.attachments?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Attachments</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {complaint.attachments.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                    📎 Attachment {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {complaint.admin_response && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Admin Response</div>
              <div style={{ padding: '10px 14px', background: 'rgba(0,194,255,.1)', borderRadius: 8, borderLeft: `3px solid var(--accent)` }}>
                {complaint.admin_response}
              </div>
            </div>
          )}
          
          {/* Admin Actions */}
          {user.role === 'admin' && complaint.status !== 'resolved' && complaint.status !== 'rejected' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Admin Response</div>
              <textarea
                className="form-textarea"
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Add a response to this complaint..."
                rows={3}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-info btn-sm" onClick={() => handleStatusUpdate('in_review')} disabled={isUpdating}>
                  Mark In Review
                </button>
                <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate('resolved')} disabled={isUpdating}>
                  Mark Resolved
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleStatusUpdate('rejected')} disabled={isUpdating}>
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}