import React, { useState, useEffect } from 'react';
import { Plus, Wrench, ShieldAlert, Check } from 'lucide-react';

function Maintenance({ user, fetchWithAuth }) {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Maintenance Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');

  // Close Maintenance Form State
  const [closeLogId, setCloseLogId] = useState(null);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [cost, setCost] = useState('');
  const [closeErrorMsg, setCloseErrorMsg] = useState('');

  const isManager = user.role === 'Fleet Manager';

  const loadData = async () => {
    try {
      setLoading(true);
      const resLogs = await fetchWithAuth('/api/maintenance');
      const logsData = await resLogs.json();
      setLogs(logsData);

      const resVehicles = await fetchWithAuth('/api/vehicles');
      const vehiclesData = await resVehicles.json();
      setVehicles(vehiclesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedVehicleId('');
    setDescription('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleCreateMaintenance = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedVehicleId || !description || !startDate) {
      setErrorMsg('All fields are required');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: parseInt(selectedVehicleId),
          description,
          startDate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit maintenance log');

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleOpenCloseModal = (logId) => {
    setCloseLogId(logId);
    setEndDate(new Date().toISOString().split('T')[0]);
    setCost('');
    setCloseErrorMsg('');
  };

  const handleCloseMaintenance = async (e) => {
    e.preventDefault();
    setCloseErrorMsg('');

    if (!endDate || cost === '') {
      setCloseErrorMsg('End date and cost details are required');
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/maintenance/${closeLogId}/close`, {
        method: 'POST',
        body: JSON.stringify({
          endDate,
          cost: parseFloat(cost)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close maintenance card');

      setCloseLogId(null);
      loadData();
    } catch (err) {
      setCloseErrorMsg(err.message);
    }
  };

  const availableVehiclesForMaint = vehicles.filter(v => v.status === 'Available');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title & Actions Row */}
      <div className="filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Garage & Workshop Scheduler</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Manage repairs, schedule safety inspections, and restore vehicles to service.</p>
        </div>

        {isManager && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            Book Maintenance
          </button>
        )}
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Vehicle Ref</th>
                <th>Description</th>
                <th>Workshop In</th>
                <th>Workshop Out</th>
                <th>Invoiced Cost</th>
                <th>Workflow Status</th>
                {isManager && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isManager ? 8 : 7} style={{ textAlign: 'center', padding: '24px' }}>
                    Loading maintenance logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 8 : 7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No workshop bookings logged.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td>#{log.id}</td>
                    <td style={{ fontWeight: 600 }}>{log.vehicle?.registrationNumber}</td>
                    <td>{log.description}</td>
                    <td>{log.startDate}</td>
                    <td>{log.endDate || 'Ongoing'}</td>
                    <td>{log.cost > 0 ? `$${log.cost.toLocaleString()}` : '-'}</td>
                    <td>
                      <span className={`badge badge-${log.status === 'Active' ? 'shop' : 'completed'}`}>
                        {log.status}
                      </span>
                    </td>
                    {isManager && (
                      <td style={{ textAlign: 'right' }}>
                        {log.status === 'Active' && (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'var(--success)' }}
                            onClick={() => handleOpenCloseModal(log.id)}
                          >
                            <Check size={12} style={{ marginRight: '4px' }} />
                            Release Vehicle
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Maintenance Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Book Vehicle for Maintenance</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateMaintenance}>
              <div className="form-group">
                <label>Select Available Vehicle *</label>
                <select 
                  className="select-input" 
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Vehicle --</option>
                  {availableVehiclesForMaint.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} ({v.model})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <ShieldAlert size={12} style={{ color: 'var(--warning)' }} />
                  Allocating a vehicle to maintenance instantly triggers 'In Shop' status.
                </span>
              </div>

              <div className="form-group">
                <label>Description of Issue / Job *</label>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="e.g. 50,000 km Oil & Filter Change" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Workshop Entry Date *</label>
                <input 
                  type="date" 
                  className="text-input" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
                  {errorMsg}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary">
                  Book Workshop Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Release Vehicle (Close Maintenance) Modal */}
      {closeLogId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Log Workshop Completion</h3>
              <button className="close-btn" onClick={() => setCloseLogId(null)}>&times;</button>
            </div>

            <form onSubmit={handleCloseMaintenance}>
              <div className="form-group">
                <label>Workshop Exit Date *</label>
                <input 
                  type="date" 
                  className="text-input" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Maintenance Cost Invoiced ($) *</label>
                <input 
                  type="number" 
                  className="text-input" 
                  placeholder="e.g. 450" 
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                />
              </div>

              {closeErrorMsg && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
                  {closeErrorMsg}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCloseLogId(null)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--success)' }}>
                  Submit Invoice & Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Maintenance;
