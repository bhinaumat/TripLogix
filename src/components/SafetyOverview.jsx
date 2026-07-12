import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, AlertOctagon, AlertTriangle, User } from 'lucide-react';

function SafetyOverview({ user, fetchWithAuth, mode, setActiveTab }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Safety Audit Modal State
  const [selectedDriverForAudit, setSelectedDriverForAudit] = useState(null);
  const [auditAction, setAuditAction] = useState('Seminar'); // 'Seminar' | 'Warning' | 'Suspended' | 'Clear'
  const [auditNotes, setAuditNotes] = useState('');

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/drivers');
      const data = await res.json();
      setDrivers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [mode]);

  const getLicenseStatus = (expiryDateStr) => {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (expiry < today) {
      return { label: 'Expired', color: 'var(--danger)', bg: 'var(--danger-light)', expired: true };
    } else if (expiry <= thirtyDaysFromNow) {
      return { label: 'Expiring Soon', color: 'var(--warning)', bg: 'var(--warning-light)', expired: false };
    }
    return { label: 'Active', color: 'var(--success)', bg: 'var(--success-light)', expired: false };
  };

  // Safety Score calculations
  const validDrivers = drivers.filter(d => d.safetyScore !== undefined && d.safetyScore !== null);
  const avgSafetyScore = validDrivers.length > 0 
    ? Math.round(validDrivers.reduce((sum, d) => sum + d.safetyScore, 0) / validDrivers.length) 
    : 100;
  
  const lowSafetyDrivers = drivers.filter(d => d.safetyScore < 70);

  // License expiry calculations
  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysLater = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  const expiredLicensesList = drivers.filter(d => {
    if (!d.licenseExpiryDate) return false;
    const expDate = new Date(d.licenseExpiryDate);
    return expDate < today;
  });

  const expiringLicensesList = drivers.filter(d => {
    if (!d.licenseExpiryDate) return false;
    const expDate = new Date(d.licenseExpiryDate);
    return expDate >= today && expDate <= thirtyDaysLater;
  });

  const expiringSoonLicensesList = drivers.filter(d => {
    if (!d.licenseExpiryDate) return false;
    const expDate = new Date(d.licenseExpiryDate);
    return expDate > thirtyDaysLater && expDate <= ninetyDaysLater;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* HEADER DESCRIPTIONS */}
      <div>
        {mode === 'licenses' && (
          <>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)' }}>License Validity & Tracking</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Tracks driver license validity, category compliance, and flags immediate credentials renewals.
            </p>
          </>
        )}
        {mode === 'safety_audits' && (
          <>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Driver Safety Score Monitor</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Monitors safe driving ratings, speed limits violation logs, and alerts crew needing compliance audits.
            </p>
          </>
        )}
      </div>

      {/* KPI GRID */}
      <div className="kpis-grid" style={{ margin: 0 }}>
        {mode === 'licenses' && (
          <>
            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: expiredLicensesList.length > 0 ? 'var(--danger-light)' : 'var(--success-light)', color: expiredLicensesList.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                <AlertOctagon size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Expired Licenses</span>
                <span className="kpi-value" style={{ color: expiredLicensesList.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {expiredLicensesList.length} Active
                </span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: expiringLicensesList.length > 0 ? 'var(--warning-light)' : 'var(--bg-tertiary)', color: expiringLicensesList.length > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                <AlertTriangle size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Expiring (30 days)</span>
                <span className="kpi-value">{expiringLicensesList.length}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
                <ShieldCheck size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Expiring (90 days)</span>
                <span className="kpi-value">{expiringSoonLicensesList.length}</span>
              </div>
            </div>
          </>
        )}

        {mode === 'safety_audits' && (
          <>
            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                <ShieldCheck size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Average Safety rating</span>
                <span className="kpi-value">{avgSafetyScore} pts</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: lowSafetyDrivers.length > 0 ? 'var(--danger-light)' : 'var(--success-light)', color: lowSafetyDrivers.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                <ShieldAlert size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Safety Alerts (&lt; 70 pts)</span>
                <span className="kpi-value" style={{ color: lowSafetyDrivers.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {lowSafetyDrivers.length} Drivers
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CORE WORK TABLES */}
      <div className="card">
        {mode === 'licenses' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Compliance & License Expiration Warning Board</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Overview of crew credentials requiring renewal or suspension audits.</p>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Driver Name</th>
                    <th>License Number</th>
                    <th>License Category</th>
                    <th>Expiry Date</th>
                    <th>Contact</th>
                    <th>Indicator Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '16px' }}>Loading warnings...</td>
                    </tr>
                  ) : drivers.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        No drivers registered in the system.
                      </td>
                    </tr>
                  ) : (
                    drivers.map(d => {
                      const licState = getLicenseStatus(d.licenseExpiryDate);
                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.name}</td>
                          <td>{d.licenseNumber}</td>
                          <td>{d.licenseCategory}</td>
                          <td style={{ 
                            color: licState.expired ? 'var(--danger)' : licState.label === 'Expiring Soon' ? '#f59e0b' : 'var(--text-primary)', 
                            fontWeight: licState.expired || licState.label === 'Expiring Soon' ? 600 : 400 
                          }}>
                            {d.licenseExpiryDate}
                          </td>
                          <td>{d.contactNumber || 'N/A'}</td>
                          <td>
                            <span 
                              className="badge" 
                              style={{ 
                                backgroundColor: licState.expired ? 'rgba(239, 68, 68, 0.1)' : licState.label === 'Expiring Soon' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                                color: licState.expired ? '#ef4444' : licState.label === 'Expiring Soon' ? '#f59e0b' : '#10b981',
                                border: `1px solid ${licState.expired ? 'rgba(239, 68, 68, 0.2)' : licState.label === 'Expiring Soon' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                                fontSize: '0.7rem'
                              }}
                            >
                              {licState.expired ? 'Expired' : licState.label === 'Expiring Soon' ? 'Expiring Soon' : 'Valid'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {mode === 'safety_audits' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Crew Safety Audits</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Monitoring of drivers whose safety scores have dipped below target targets.</p>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Driver Name</th>
                    <th>Safety Score</th>
                    <th>Work Status</th>
                    <th>Compliance Check</th>
                    <th>Review Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '16px' }}>Loading safety sheet...</td>
                    </tr>
                  ) : drivers.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        No drivers registered in the system.
                      </td>
                    </tr>
                  ) : (
                    drivers.map(d => {
                      const isLowSafety = d.safetyScore < 70;
                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.name}</td>
                          <td style={{ color: isLowSafety ? '#ef4444' : d.safetyScore >= 85 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                            {d.safetyScore || 100} pts
                          </td>
                          <td>
                            <span className={`badge badge-${d.status.toLowerCase().replace(' ', '')}`}>{d.status}</span>
                          </td>
                          <td>
                            {isLowSafety ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                                <ShieldAlert size={14} /> Attention Needed
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                                <ShieldCheck size={14} /> Compliant
                              </span>
                            )}
                          </td>
                          <td>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.75rem' }} 
                              onClick={() => { setSelectedDriverForAudit(d); setAuditNotes(''); }}
                            >
                              Assign Training / Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Safety Audit & Training Resolution Modal */}
      {selectedDriverForAudit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Safety Audit & Training Resolution</h3>
              <button className="close-btn" onClick={() => setSelectedDriverForAudit(null)}>&times;</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const { id, ...driverData } = selectedDriverForAudit;
                const payload = {
                  ...driverData,
                  status: auditAction === 'Suspended' ? 'Suspended' : driverData.status
                };
                
                console.log('[SafetyOverview] Submitting safety resolution payload:', payload);

                const res = await fetchWithAuth(`/api/drivers/${id}`, {
                  method: 'PUT',
                  body: JSON.stringify(payload)
                });
                
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error || `HTTP error ${res.status}`);
                }
                
                setSelectedDriverForAudit(null);
                loadDrivers();
                alert(`Safety audit resolution successfully applied for ${selectedDriverForAudit.name}! Action: ${auditAction}`);
              } catch (err) {
                console.error('[SafetyOverview] Safety audit submission failed:', err);
                alert(`Failed to apply safety audit resolution: ${err.message}`);
              }
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Driver Profile:</div>
                  <div style={{ color: 'var(--text-secondary)' }}>Name: {selectedDriverForAudit.name}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>License Number: {selectedDriverForAudit.licenseNumber}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>Current Safety Rating: <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{selectedDriverForAudit.safetyScore} pts</span></div>
                </div>

                <div className="form-group">
                  <label>Assign Compliance Resolution Action *</label>
                  <select 
                    className="select-input" 
                    value={auditAction} 
                    onChange={(e) => setAuditAction(e.target.value)}
                  >
                    <option value="Seminar">Assign Safe Driving Seminar</option>
                    <option value="Warning">Issue Official Safety Warning</option>
                    <option value="Suspended">Suspend Driver Profile</option>
                    <option value="Clear">Clear Safety Alert (Allow Dispatch)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Auditor Notes & Observations</label>
                  <textarea 
                    className="text-input" 
                    placeholder="Describe specific safety violations, speed log reviews, or reasons for clearing the alert..."
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    style={{ minHeight: '80px', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedDriverForAudit(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default SafetyOverview;
