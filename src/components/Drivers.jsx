import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, AlertTriangle, ShieldCheck, ShieldAlert, Award, Calendar, ArrowUpDown } from 'lucide-react';

function Drivers({ user, fetchWithAuth }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'expiry' | 'safety'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingDriverId, setEditingDriverId] = useState(null);

  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseCategory, setLicenseCategory] = useState('Light Commercial');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [safetyScore, setSafetyScore] = useState('100');
  const [status, setStatus] = useState('Available');
  const [errorMsg, setErrorMsg] = useState('');

  const isWriteAuthorized = user.role === 'Fleet Manager' || user.role === 'Safety Officer' || user.role === 'Driver';

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
  }, []);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setName('');
    setLicenseNumber('');
    setLicenseCategory('Light Commercial');
    setLicenseExpiryDate('');
    setContactNumber('');
    setSafetyScore('100');
    setStatus('Available');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (driver) => {
    setModalMode('edit');
    setEditingDriverId(driver.id);
    setName(driver.name);
    setLicenseNumber(driver.licenseNumber);
    setLicenseCategory(driver.licenseCategory);
    setLicenseExpiryDate(driver.licenseExpiryDate);
    setContactNumber(driver.contactNumber);
    setSafetyScore(driver.safetyScore.toString());
    setStatus(driver.status);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveDriver = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !licenseNumber || !licenseCategory || !licenseExpiryDate || !contactNumber) {
      setErrorMsg('All fields marked with * are required');
      return;
    }

    const digitsOnly = contactNumber.replace(/\D/g, '');
    const isValid10Digit = digitsOnly.length === 10 || (digitsOnly.length === 12 && digitsOnly.startsWith('91')) || (digitsOnly.length === 11 && digitsOnly.startsWith('0'));
    if (!isValid10Digit) {
      setErrorMsg('Contact Phone Number must be a valid 10-digit mobile number (e.g. 9909098765 or +91 99090 98765)');
      return;
    }

    const payload = {
      name,
      licenseNumber,
      licenseCategory,
      licenseExpiryDate,
      contactNumber,
      safetyScore: parseFloat(safetyScore),
      status
    };

    try {
      let res;
      if (modalMode === 'create') {
        res = await fetchWithAuth('/api/drivers', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetchWithAuth(`/api/drivers/${editingDriverId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save driver profile');
      }

      setIsModalOpen(false);
      loadDrivers();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteDriver = async (id) => {
    if (!window.confirm('Are you sure you want to remove this driver profile?')) return;
    try {
      const res = await fetchWithAuth(`/api/drivers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete driver');
      }
      loadDrivers();
    } catch (err) {
      alert(err.message);
    }
  };

  // License Expiry Visual Alert Calculation
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

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || 
                          d.licenseNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'name') {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
    } else if (sortBy === 'expiry') {
      valA = new Date(a.licenseExpiryDate);
      valB = new Date(b.licenseExpiryDate);
    } else if (sortBy === 'safety') {
      valA = a.safetyScore;
      valB = b.safetyScore;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const averageSafety = drivers.length > 0
    ? Math.round(drivers.reduce((acc, curr) => acc + curr.safetyScore, 0) / drivers.length)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.45rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={26} style={{ color: '#d85a38' }} />
            Driver Management & Compliance
          </h2>
        </div>
        {isWriteAuthorized && (
          <button 
            className="btn" 
            onClick={handleOpenCreateModal}
            style={{ 
              backgroundColor: '#d85a38', 
              borderColor: '#d85a38', 
              color: '#fff', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '10px 18px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)'
            }}
          >
            <Plus size={16} />
            Register Driver
          </button>
        )}
      </div>



      {/* Search, Filter & Sort Panel */}
      <div className="filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="text-input" 
              placeholder="Search driver name or license..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>

          <select 
            className="select-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ maxWidth: '200px' }}
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select 
            className="select-input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="name">Sort: Driver Name</option>
            <option value="expiry">Sort: License Expiry</option>
          </select>

          <button 
            className="btn btn-secondary"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Toggle Sort Direction"
          >
            <ArrowUpDown size={18} />
          </button>
        </div>
      </div>

      {/* Main Grid/Table */}
      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>License Details</th>
                <th>Category</th>
                <th>License Expiry</th>
                <th>License Status</th>
                <th>Contact Number</th>
                <th>Status</th>
                <th>Compliance Alerts</th>
                {isWriteAuthorized && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isWriteAuthorized ? 9 : 8} style={{ textAlign: 'center', padding: '24px' }}>
                    Loading driver rosters...
                  </td>
                </tr>
              ) : sortedDrivers.length === 0 ? (
                <tr>
                  <td colSpan={isWriteAuthorized ? 9 : 8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No drivers found matching filters.
                  </td>
                </tr>
              ) : (
                sortedDrivers.map(driver => {
                  const licState = getLicenseStatus(driver.licenseExpiryDate);
                  const isCompliant = !licState.expired && driver.status !== 'Suspended';

                  return (
                    <tr key={driver.id}>
                      <td style={{ fontWeight: 600 }}>{driver.name}</td>
                      <td>
                        <span style={{ display: 'block', fontSize: '0.85rem' }}>{driver.licenseNumber}</span>
                      </td>
                      <td>{driver.licenseCategory}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                          {driver.licenseExpiryDate}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="badge" 
                          style={{ 
                            backgroundColor: licState.expired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                            color: licState.expired ? '#ef4444' : '#10b981',
                            border: `1px solid ${licState.expired ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                          }}
                        >
                          {licState.expired ? 'Expired' : 'Valid'}
                        </span>
                      </td>
                      <td>{driver.contactNumber || 'N/A'}</td>
                      <td>
                        <span className={`badge badge-${driver.status.toLowerCase().replace(' ', '')}`}>
                          {driver.status}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="badge"
                          style={{ 
                            backgroundColor: isCompliant ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                            color: isCompliant ? '#10b981' : '#ef4444',
                            border: `1px solid ${isCompliant ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                          }}
                        >
                          {isCompliant ? 'Compliant' : 'Non-Compliant'}
                        </span>
                      </td>
                      {isWriteAuthorized && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 10px' }}
                              onClick={() => handleOpenEditModal(driver)}
                            >
                              <Edit size={14} />
                            </button>
                            {user.role === 'Fleet Manager' && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 10px', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                                onClick={() => handleDeleteDriver(driver.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Driver Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Add New Driver Profile' : 'Edit Driver Details'}</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSaveDriver}>
              <div className="form-group">
                <label>Driver Full Name *</label>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="e.g. David Beckham" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>License Number *</label>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="e.g. DL-19283" 
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>License Category *</label>
                  <select className="select-input" value={licenseCategory} onChange={(e) => setLicenseCategory(e.target.value)}>
                    <option value="Light Commercial">Light Commercial</option>
                    <option value="Medium Commercial">Medium Commercial</option>
                    <option value="Heavy Commercial">Heavy Commercial</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>License Expiration Date *</label>
                  <input 
                    type="date" 
                    className="text-input" 
                    value={licenseExpiryDate}
                    onChange={(e) => setLicenseExpiryDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Phone Number *</label>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="e.g. 9909098765" 
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Work Status</label>
                  <select className="select-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
                  {errorMsg}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' ? 'Create Profile' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Drivers;
