import React from 'react';
import { format } from 'date-fns';

export default function ReadOnlyRecordView({ record, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Medical Record (View Only)</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'rgba(0,194,255,.1)', padding: '8px 12px', borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
            ⓘ This is a read-only view. You cannot edit this record.
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Info label="Doctor" value={`Dr. ${record.doctor_id?.name}`} />
            <Info label="Specialization" value={record.doctor_id?.specialization} />
            <Info label="Date" value={record.date ? format(new Date(record.date), 'MMMM d, yyyy') : '—'} />
            <Info label="Diagnosis" value={record.diagnosis} />
          </div>

          {record.symptoms?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Symptoms</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {record.symptoms.map((s, i) => <span key={i} className="badge badge-info">{s}</span>)}
              </div>
            </div>
          )}

          {record.vital_signs && Object.values(record.vital_signs).some(Boolean) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Vital Signs</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {record.vital_signs.blood_pressure && <VitalBadge label="BP" value={record.vital_signs.blood_pressure} />}
                {record.vital_signs.pulse && <VitalBadge label="Pulse" value={record.vital_signs.pulse} />}
                {record.vital_signs.temperature && <VitalBadge label="Temp" value={record.vital_signs.temperature} />}
                {record.vital_signs.oxygen_level && <VitalBadge label="SpO₂" value={record.vital_signs.oxygen_level} />}
              </div>
            </div>
          )}

          {record.prescriptions?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Prescriptions</div>
              {record.prescriptions.map((rx, i) => (
                <div key={i} style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 8 }}>
                  <strong>{rx.medicine}</strong>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    {rx.dosage} • {rx.frequency} • {rx.duration}
                  </div>
                  {rx.notes && <div style={{ fontSize: 11, marginTop: 4 }}>📝 {rx.notes}</div>}
                </div>
              ))}
            </div>
          )}

          {record.other_records && <Info label="Additional Notes" value={record.other_records} />}
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
    <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13 }}>{value || '—'}</div>
  </div>
);

const VitalBadge = ({ label, value }) => (
  <div style={{ padding: '4px 10px', background: 'var(--surface3)', borderRadius: 8, fontSize: 12 }}>
    <span style={{ color: 'var(--muted)' }}>{label}:</span> <strong>{value}</strong>
  </div>
);