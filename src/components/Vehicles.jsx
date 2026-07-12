import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';

function Vehicles({ user, fetchWithAuth, viewModeProp }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState(viewModeProp || 'registry');

  useEffect(() => {
    if (viewModeProp) {
      setViewMode(viewModeProp);
    }
  }, [viewModeProp]);

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  
  const [regNumber, setRegNumber] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('Van');
  const [capacity, setCapacity] = useState('');
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState('Available');
  const [region, setRegion] = useState('North');
  const [errorMsg, setErrorMsg] = useState('');

  const isWriteAuthorized = user.role === 'Fleet Manager' || user.role === 'Driver';
  const isManager = user.role === 'Fleet Manager';

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/vehicles');
      const data = await res.json();
      setVehicles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setRegNumber('');
    setModel('');
    setType('Van');
    setCapacity('');
    setOdometer('');
    setCost('');
    setStatus('Available');
    setRegion('North');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vehicle) => {
    setModalMode('edit');
    setEditingVehicleId(vehicle.id);
    setRegNumber(vehicle.registrationNumber);
    setModel(vehicle.model);
    setType(vehicle.type);
    setCapacity(vehicle.maxLoadCapacity.toString());
    setOdometer(vehicle.odometer.toString());
    setCost(vehicle.acquisitionCost.toString());
    setStatus(vehicle.status);
    setRegion(vehicle.region);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regNumber || !model || !capacity || !odometer || !cost) {
      setErrorMsg('All fields marked with * are required');
      return;
    }

    const cleanedReg = regNumber.replace(/\s+/g, '');
    const regPattern = /^[a-zA-Z0-9-]+$/;
    if (!regPattern.test(cleanedReg)) {
      setErrorMsg('Registration Number must be alphanumeric and can only contain letters, numbers, and hyphens (e.g. TRK-02)');
      return;
    }

    const isDuplicate = vehicles.some(v => 
      v.registrationNumber.replace(/\s+/g, '').toUpperCase() === cleanedReg.toUpperCase() && 
      (modalMode === 'create' || v.id !== editingVehicleId)
    );
    if (isDuplicate) {
      setErrorMsg('Vehicle Registration Number must be unique');
      return;
    }

    const payload = {
      registrationNumber: cleanedReg,
      model,
      type,
      maxLoadCapacity: parseFloat(capacity),
      odometer: parseFloat(odometer),
      acquisitionCost: parseFloat(cost),
      status,
      region
    };

    try {
      let res;
      if (modalMode === 'create') {
        res = await fetchWithAuth('/api/vehicles', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetchWithAuth(`/api/vehicles/${editingVehicleId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save vehicle details');
      }

      setIsModalOpen(false);
      loadVehicles();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm(isManager ? 'Are you sure you want to delete this vehicle from the fleet assets?' : 'Are you sure you want to delete this vehicle from the registry?')) return;
    try {
      const res = await fetchWithAuth(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete vehicle');
      }
      loadVehicles();
    } catch (err) {
      alert(err.message);
    }
  };

  const calculateLifecycleStats = (vehicle) => {
    const targetKm = 300000; // Target lifecycle lifespan
    const progressPercent = Math.min(Math.round((vehicle.odometer / targetKm) * 100), 100);

    const maxDepreciation = vehicle.acquisitionCost * 0.9;
    const depreciationValue = Math.min(vehicle.odometer * 0.25, maxDepreciation);
    const residualValue = vehicle.acquisitionCost - depreciationValue;

    let stage = 'New';
    let badgeClass = 'available';

    if (vehicle.status === 'Retired') {
      stage = 'Decommissioned';
      badgeClass = 'cancelled';
    } else if (vehicle.odometer < 50000) {
      stage = 'New (Optimal)';
      badgeClass = 'available';
    } else if (vehicle.odometer >= 50000 && vehicle.odometer < 150000) {
      stage = 'Mid-Life (Active)';
      badgeClass = 'trip';
    } else if (vehicle.odometer >= 150000 && vehicle.odometer < 250000) {
      stage = 'High-Mileage (Critical)';
      badgeClass = 'shop';
    } else {
      stage = 'End-of-Life (Replace)';
      badgeClass = 'cancelled';
    }

    return {
      progressPercent,
      depreciationValue,
      residualValue,
      stage,
      badgeClass
    };
  };

  const handleRetireVehicle = async (vehicle) => {
    if (!window.confirm(`Are you sure you want to retire and decommission vehicle ${vehicle.registrationNumber}?`)) {
      return;
    }

    try {
      const payload = {
        ...vehicle,
        status: 'Retired'
      };
      const res = await fetchWithAuth(`/api/vehicles/${vehicle.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update vehicle');
      }
      loadVehicles();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.registrationNumber.toLowerCase().includes(search.toLowerCase()) || 
                          v.model.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* View Mode Toggle Switch */}
      {!viewModeProp && (
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <button 
            className={`btn ${viewMode === 'registry' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('registry')}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            Asset Registry
          </button>
          <button 
            className={`btn ${viewMode === 'lifecycle' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('lifecycle')}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            Lifecycle & Depreciation Analysis
          </button>
        </div>
      )}

      {viewMode === 'registry' ? (
        <>
          {/* Search & Actions Panel */}
          <div className="filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '16px', flex: 1, maxWidth: '600px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Search by registration or model..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '38px', width: '100%' }}
                />
              </div>

              <select 
                className="select-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="On Trip">On Trip</option>
                <option value="In Shop">In Shop</option>
                <option value="Retired">Retired</option>
              </select>
            </div>

            {isWriteAuthorized && (
              <button className="btn btn-primary" onClick={handleOpenCreateModal}>
                <Plus size={18} />
                {isManager ? 'Add Vehicle' : 'Register Vehicle'}
              </button>
            )}
          </div>

          {/* Main Grid/Table */}
          <div className="card">
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Registration</th>
                    <th>Model</th>
                    <th>Type</th>
                    <th>Max Capacity</th>
                    <th>Odometer</th>
                    <th>Acquisition Cost</th>
                    <th>Region</th>
                    <th>Status</th>
                    {isWriteAuthorized && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isWriteAuthorized ? 9 : 8} style={{ textAlign: 'center', padding: '24px' }}>
                        {isManager ? 'Loading fleet assets...' : 'Loading vehicle registry...'}
                      </td>
                    </tr>
                  ) : filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={isWriteAuthorized ? 9 : 8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        {isManager ? 'No fleet assets found matching filters.' : 'No vehicles found matching filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map(vehicle => (
                      <tr key={vehicle.id}>
                        <td style={{ fontWeight: 600 }}>{vehicle.registrationNumber}</td>
                        <td>{vehicle.model}</td>
                        <td>{vehicle.type}</td>
                        <td>{vehicle.maxLoadCapacity.toLocaleString()} kg</td>
                        <td>{vehicle.odometer.toLocaleString()} km</td>
                        <td>${vehicle.acquisitionCost.toLocaleString()}</td>
                        <td>{vehicle.region}</td>
                        <td>
                          <span className={`badge badge-${vehicle.status.toLowerCase().replace(' ', '')}`}>
                            {vehicle.status}
                          </span>
                        </td>
                        {/* Render registry actions if write authorized */}
                        {isWriteAuthorized && (
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 10px' }}
                                onClick={() => handleOpenEditModal(vehicle)}
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 10px', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                                onClick={() => handleDeleteVehicle(vehicle.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Lifecycle & Depreciation Analysis Board */}
          <div className="card">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Asset Lifecycle & Depreciation Tracker</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Analytical audit of estimated remaining lifespan relative to odometer depreciation.</p>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Registration</th>
                    <th>Model</th>
                    <th style={{ width: '180px' }}>Lifespan Progress</th>
                    <th>Acquisition Cost</th>
                    <th>Est. Depreciation</th>
                    <th>Book Value (Residual)</th>
                    <th>Lifecycle Stage</th>
                    {isManager && <th style={{ textAlign: 'right' }}>Lifecycle Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isManager ? 8 : 7} style={{ textAlign: 'center', padding: '24px' }}>
                        Loading lifecycle telemetry...
                      </td>
                    </tr>
                  ) : vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={isManager ? 8 : 7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No fleet assets registered.
                      </td>
                    </tr>
                  ) : (
                    vehicles.map(vehicle => {
                      const stats = calculateLifecycleStats(vehicle);
                      return (
                        <tr key={vehicle.id}>
                          <td style={{ fontWeight: 600 }}>{vehicle.registrationNumber}</td>
                          <td>{vehicle.model} ({vehicle.type})</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <span>{vehicle.odometer.toLocaleString()} km</span>
                                <span>{stats.progressPercent}%</span>
                              </div>
                              <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ 
                                  height: '100%', 
                                  width: `${stats.progressPercent}%`, 
                                  backgroundColor: stats.progressPercent > 80 ? 'var(--danger)' : stats.progressPercent > 50 ? 'var(--warning)' : 'var(--success)', 
                                  borderRadius: '3px' 
                                }}></div>
                              </div>
                            </div>
                          </td>
                          <td>${vehicle.acquisitionCost.toLocaleString()}</td>
                          <td style={{ color: 'var(--danger)' }}>-${Math.round(stats.depreciationValue).toLocaleString()}</td>
                          <td style={{ fontWeight: 700, color: 'var(--success)' }}>${Math.round(stats.residualValue).toLocaleString()}</td>
                          <td>
                            <span className={`badge badge-${stats.badgeClass}`}>
                              {stats.stage}
                            </span>
                          </td>
                          {isManager && (
                            <td style={{ textAlign: 'right' }}>
                              {vehicle.status === 'Retired' ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Inactive</span>
                              ) : (
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                                  onClick={() => handleRetireVehicle(vehicle)}
                                >
                                  Retire Asset
                                </button>
                              )}
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
        </>
      )}

      {/* Register/Edit Vehicle Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isManager ? (modalMode === 'create' ? 'Add New Vehicle' : 'Edit Vehicle Details') : (modalMode === 'create' ? 'Register New Vehicle' : 'Edit Vehicle Details')}</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSaveVehicle}>
              <div className="form-row">
                <div className="form-group">
                  <label>Registration Number *</label>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="e.g. VAN-05" 
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Vehicle Model/Name *</label>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="e.g. Ford Cargo 2023" 
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vehicle Type *</label>
                  <select className="select-input" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                    <option value="Sedan">Sedan</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Max Load Capacity (kg) *</label>
                  <input 
                    type="number" 
                    className="text-input" 
                    placeholder="e.g. 500" 
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Odometer Reading (km) *</label>
                  <input 
                    type="number" 
                    className="text-input" 
                    placeholder="e.g. 15000" 
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Acquisition Cost ($) *</label>
                  <input 
                    type="number" 
                    className="text-input" 
                    placeholder="e.g. 45000" 
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select className="select-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Operational Region</label>
                  <select className="select-input" value={region} onChange={(e) => setRegion(e.target.value)}>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
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
                  {isManager ? (modalMode === 'create' ? 'Add Asset' : 'Save Changes') : (modalMode === 'create' ? 'Register Vehicle' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Vehicles;
