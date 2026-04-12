import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { format } from 'date-fns';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['#00c2ff', '#00ff9d', '#ff5e7d', '#9b6fff', '#ff9540'];

const StatusBadge = ({ status }) => {
  const map = { pending: 'badge-warning', confirmed: 'badge-info', completed: 'badge-success', cancelled: 'badge-danger', rescheduled: 'badge-purple' };
  return <span className={`badge ${map[status] || 'badge-info'}`}>{status}</span>;
};

export default function Dashboard() {
  const { user, api } = useAuth();
  const { onlineUsers } = useSocket();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line
  }, []);

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  const s = data?.stats || {};
  const recent = data?.recentAppointments || [];

  // Mock weekly chart data
  const weekData = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => ({
    day: d, appointments: Math.floor(Math.random() * 8 + 2), records: Math.floor(Math.random() * 5 + 1),
  }));

  const renderAdminStats = () => (
    <div className="stat-grid">
      <StatCard icon="🧑‍⚕️" label="Total Patients"   value={s.patients}   color="blue"   trend="+12 this week" />
      <StatCard icon="👨‍⚕️" label="Total Doctors"    value={s.doctors}    color="green"  trend={`${onlineUsers.length} online`} />
      <StatCard icon="📅" label="Appointments"     value={s.appointments} color="purple" trend={`${s.pendingAppts} pending`} />
      <StatCard icon="🏨" label="Hospitals"        value={s.hospitals}  color="orange" />
      <StatCard icon="📋" label="Medical Records"  value={s.records}    color="blue"  />
      <StatCard icon="🧪" label="Lab Reports"      value={s.labs}       color="red"   />
    </div>
  );

  const renderDoctorStats = () => (
    <div className="stat-grid">
      <StatCard icon="👥" label="My Patients"     value={s.myPatients}     color="blue"   />
      <StatCard icon="📅" label="Total Appts"     value={s.myAppointments} color="green"  trend={`${s.todayAppts} today`} />
      <StatCard icon="⏳" label="Pending Appts"   value={s.pendingAppts}   color="orange" />
      <StatCard icon="📋" label="Medical Records" value={s.myRecords}      color="purple" />
    </div>
  );

  const renderPatientStats = () => (
    <div className="stat-grid">
      <StatCard icon="📅" label="Appointments"    value={s.appointments} color="blue"   trend={`${s.upcoming} upcoming`} />
      <StatCard icon="📋" label="Medical Records" value={s.records}      color="green"  />
      <StatCard icon="🧪" label="Lab Reports"     value={s.labs}         color="purple" />
    </div>
  );

  return (
    <div>
      {/* Welcome */}
      <div className="page-header">
        <div>
          <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p>{format(new Date(), 'EEEE, MMMM d yyyy')} • {user?.role?.toUpperCase()}</p>
        </div>
      </div>

      {/* Stats */}
      {user?.role === 'admin'   && renderAdminStats()}
      {user?.role === 'doctor'  && renderDoctorStats()}
      {user?.role === 'patient' && renderPatientStats()}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        {/* Weekly Chart */}
        <div className="card">
          <div className="card-title">Weekly Activity</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weekData}>
              <defs>
                <linearGradient id="cAppt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00c2ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00c2ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="cRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00ff9d" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00ff9d" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#4a6a88', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a6a88', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0c1422', border: '1px solid #1a2c42', borderRadius: 10, fontSize: 12 }} />
              <Area type="monotone" dataKey="appointments" stroke="#00c2ff" fill="url(#cAppt)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="records"      stroke="#00ff9d" fill="url(#cRec)"  strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <Legend color="#00c2ff" label="Appointments" />
            <Legend color="#00ff9d" label="Records" />
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="card">
          <div className="card-title">Recent Appointments</div>
          {recent.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <div className="icon">📅</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>No appointments yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent.slice(0, 5).map(a => (
                <div key={a._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {user?.role === 'patient' ? `Dr. ${a.doctor_id?.name}` : a.patient_id?.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {a.date ? format(new Date(a.date), 'MMM d') : '—'} • {a.time}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Health Tips (patient only) */}
      {user?.role === 'patient' && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">Health Tips 💡</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {TIPS.map((t, i) => (
              <div key={i} style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 10, borderLeft: `3px solid ${CHART_COLORS[i % 5]}` }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{t.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({ icon, label, value, color, trend }) => (
  <div className={`stat-card ${color}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-value">{value ?? '—'}</div>
    <div className="stat-label">{label}</div>
    {trend && <div className="stat-trend trend-up">{trend}</div>}
  </div>
);

const Legend = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
    <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
    {label}
  </div>
);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
};

const TIPS = [
  { icon: '💧', title: 'Stay Hydrated', body: 'Drink at least 8 glasses of water daily to keep your body functioning optimally.' },
  { icon: '🏃', title: 'Exercise Daily', body: 'Even 30 minutes of walking can significantly improve your cardiovascular health.' },
  { icon: '😴', title: 'Quality Sleep', body: 'Aim for 7–9 hours of sleep per night to allow your body to recover and regenerate.' },
];
