import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { format } from 'date-fns';
import ComplaintModal from './ComplaintModal';

const NAV = {
  patient: [
    { section: 'Main', items: [
      { to: '/',                icon: '⚡', label: 'Dashboard' },
      { to: '/appointments',    icon: '📅', label: 'Appointments' },
      { to: '/medical-records', icon: '📋', label: 'Medical Records' },
      { to: '/lab-reports',     icon: '🧪', label: 'Lab Reports' },
    ]},
    { section: 'Connect', items: [
      { to: '/doctors',    icon: '👨‍⚕️', label: 'Find Doctors' },
      { to: '/chat',       icon: '💬', label: 'Messages' },
      { to: '/complaints', icon: '📝', label: 'Complaints' },
    ]},
  ],
  doctor: [
    { section: 'Main', items: [
      { to: '/',                icon: '⚡', label: 'Dashboard' },
      { to: '/appointments',    icon: '📅', label: 'Appointments' },
      { to: '/medical-records', icon: '📋', label: 'Medical Records' },
      { to: '/lab-reports',     icon: '🧪', label: 'Lab Reports' },
    ]},
    { section: 'Manage', items: [
      { to: '/patients',   icon: '🏥', label: 'My Patients' },
      { to: '/chat',       icon: '💬', label: 'Messages' },
      { to: '/complaints', icon: '📝', label: 'Complaints' },
    ]},
  ],
  admin: [
    { section: 'Main', items: [
      { to: '/',             icon: '⚡', label: 'Dashboard' },
      { to: '/appointments', icon: '📅', label: 'Appointments' },
    ]},
    { section: 'Management', items: [
      { to: '/admin/users',  icon: '👥', label: 'All Users' },
      { to: '/doctors',      icon: '👨‍⚕️', label: 'Doctors' },
      { to: '/patients',     icon: '🏥', label: 'Patients' },
      { to: '/hospitals',    icon: '🏨', label: 'Hospitals' },
      { to: '/complaints',   icon: '📝', label: 'Complaints' },
    ]},
    { section: 'Records', items: [
      { to: '/medical-records', icon: '📋', label: 'Medical Records' },
      { to: '/lab-reports',     icon: '🧪', label: 'Lab Reports' },
    ]},
  ],
};

export default function Layout() {
  const { user, logout, api } = useAuth();
  const { notifications, emergencyAlert, clearEmergency } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifs, setShowNotifs]     = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [apiNotifs,  setApiNotifs]      = useState([]);
  const notifRef = useRef();

  const unread = [...apiNotifs, ...notifications].filter(n => !n.read).length;

  useEffect(() => {
    api.get('/users/notifications').then(r => setApiNotifs(r.data)).catch(() => {});
  // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navGroups = NAV[user?.role] || NAV.patient;

  const pageTitle = () => {
    const map = {
      '/': 'Dashboard', '/appointments': 'Appointments',
      '/medical-records': 'Medical Records', '/lab-reports': 'Lab Reports',
      '/doctors': 'Doctors', '/patients': 'Patients', '/hospitals': 'Hospitals',
      '/chat': 'Messages', '/profile': 'My Profile', '/admin/users': 'User Management',
      '/complaints': 'Complaints & Feedback',
    };
    return map[location.pathname] || 'VitalByte';
  };

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();

  const handleComplaintSubmit = () => {
    // Optional: Show a success toast or refresh something
    console.log('Complaint submitted successfully');
  };

  const handleNotificationClick = (notif) => {
    if (notif.link) {
      navigate(notif.link);
      setShowNotifs(false);
    }
  };

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-row">
            <div className="logo-icon">💊</div>
            <div>
              <div className="logo-name">VitalByte</div>
              <div className="logo-tagline">Health Records</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map(group => (
            <div className="nav-section" key={group.section}>
              <div className="nav-label">{group.section}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.label === 'Messages' && unread > 0 && (
                    <span className="nav-badge">{unread}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" onClick={() => navigate('/profile')}>
            <div className="avatar">{initials}</div>
            <div className="user-info">
              <div className="u-name">{user?.name?.split(' ')[0]}</div>
              <div className="u-role">{user?.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-area">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-title">{pageTitle()}</div>
          <div className="topbar-actions">
            {/* Emergency button (patients only) */}
            {user?.role === 'patient' && (
              <EmergencyBtn user={user} />
            )}

            {/* Complaint Button */}
            <div className="icon-btn" onClick={() => setShowComplaintModal(true)} title="File a complaint">
              📝
            </div>

            {/* Notifications */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <div className="icon-btn" onClick={() => setShowNotifs(s => !s)}>
                🔔
                {unread > 0 && <span className="badge-dot" />}
              </div>
              {showNotifs && (
                <NotifPanel
                  notifs={[...notifications, ...apiNotifs].slice(0, 15)}
                  onClose={() => setShowNotifs(false)}
                  api={api}
                  navigate={navigate}
                />
              )}
            </div>

            <div className="icon-btn" onClick={() => navigate('/profile')}>👤</div>
            <button className="btn btn-outline btn-sm" onClick={logout}>Logout</button>
          </div>
        </header>

        {/* EMERGENCY BANNER */}
        {emergencyAlert && (
          <div style={{ padding: '0 32px', marginTop: 16 }}>
            <div className="emergency-banner">
              <span style={{ fontSize: 24 }}>🚨</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--danger)' }}>
                  EMERGENCY ALERT
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                  Patient {emergencyAlert.patientName} needs immediate assistance
                  {emergencyAlert.location && ` • ${emergencyAlert.location}`}
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={clearEmergency}>Dismiss</button>
            </div>
          </div>
        )}

        {/* PAGE CONTENT */}
        <main className="page-body">
          <Outlet />
        </main>
      </div>

      {/* COMPLAINT MODAL */}
      {showComplaintModal && (
        <ComplaintModal
          onClose={() => setShowComplaintModal(false)}
          onSubmit={handleComplaintSubmit}
          api={api}
        />
      )}
    </div>
  );
}

function EmergencyBtn({ user }) {
  const { emitEmergency } = useSocket();
  const [sent, setSent] = useState(false);

  const handleEmergency = () => {
    if (window.confirm('Send emergency alert to all doctors and staff?')) {
      emitEmergency({
        patientId: user._id,
        patientName: user.name,
        patientPhone: user.phone,
        location: 'Location not available',
        bloodGroup: user.blood_group,
        allergies: user.allergies,
      });
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    }
  };

  return (
    <button
      className={`btn btn-sm ${sent ? 'btn-ghost' : 'btn-danger'}`}
      onClick={handleEmergency}
      disabled={sent}
    >
      {sent ? '✅ Alert Sent' : '🚨 Emergency'}
    </button>
  );
}

function NotifPanel({ notifs, onClose, api, navigate }) {
  const markRead = async (id) => {
    await api.put(`/users/notifications/${id}/read`).catch(() => {});
  };
  
  const handleNotificationClick = (notif) => {
    if (notif.link) {
      navigate(notif.link);
      onClose();
    }
  };
  
  return (
    <div className="notif-panel">
      <div className="notif-header">
        <span>Notifications</span>
        <span className="text-muted text-sm" style={{ cursor: 'pointer' }} onClick={onClose}>✕</span>
      </div>
      {notifs.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          No notifications
        </div>
      ) : notifs.map((n, i) => (
        <div 
          key={n._id || n.id || i} 
          className={`notif-item ${!n.read ? 'unread' : ''}`} 
          onClick={() => {
            if (n._id) markRead(n._id);
            handleNotificationClick(n);
          }}
          style={{ cursor: n.link ? 'pointer' : 'default' }}
        >
          <div className="notif-title">
            {n.type === 'emergency' ? '🚨' : n.type === 'appointment' ? '📅' : n.type === 'lab_report' ? '🧪' : n.type === 'medical_record' ? '📋' : '🔔'} {n.title}
          </div>
          <div className="notif-msg">{n.message}</div>
          <div className="notif-time">{n.createdAt ? format(new Date(n.createdAt), 'MMM d, h:mm a') : 'Just now'}</div>
        </div>
      ))}
    </div>
  );
}