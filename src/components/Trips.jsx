import React, { useState, useEffect } from 'react';
import { Plus, Navigation, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

function Trips({ user, fetchWithAuth }) {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [plannedDistance, setPlannedDistance] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Complete Trip Form State
  const [completeTripId, setCompleteTripId] = useState(null);
  const [actualDistance, setActualDistance] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [completeError, setCompleteError] = useState('');

  const isOperator = user.role === 'Fleet Manager' || user.role === 'Driver';

  const loadData = async () => {
    try {
      setLoading(true);
      const resTrips = await fetchWithAuth('/api/trips');
      const tripsData = await resTrips.json();
      setTrips(tripsData);

      const resVehicles = await fetchWithAuth('/api/vehicles');
      const vehiclesData = await resVehicles.json();
      setVehicles(vehiclesData);

      const resDrivers = await fetchWithAuth('/api/drivers');
      const driversData = await resDrivers.json();
      setDrivers(driversData);
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
    setSource('');
    setDestination('');
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setCargoWeight('');
    setPlannedDistance('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!source || !destination || !selectedVehicleId || !selectedDriverId || !cargoWeight || !plannedDistance) {
      setErrorMsg('All fields are required');
      return;
    }

    const vehicle = vehicles.find(v => v.id === parseInt(selectedVehicleId));
    if (parseFloat(cargoWeight) > vehicle.maxLoadCapacity) {
      setErrorMsg(`Cargo weight (${cargoWeight} kg) exceeds vehicle load capacity limit (${vehicle.maxLoadCapacity} kg)`);
      return;
    }

    try {
      const res = await fetchWithAuth('/api/trips', {
        method: 'POST',
        body: JSON.stringify({
          source,
          destination,
          vehicleId: parseInt(selectedVehicleId),
          driverId: parseInt(selectedDriverId),
          cargoWeight: parseFloat(cargoWeight),
          plannedDistance: parseFloat(plannedDistance)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch shipment');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDispatchTrip = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/trips/${id}/dispatch`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to dispatch trip');
      }
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleOpenCompleteModal = (trip) => {
    setCompleteTripId(trip.id);
    setActualDistance(trip.plannedDistance.toString());
    setFuelConsumed(Math.round(trip.plannedDistance * 0.12).toString());
    setFuelCost(Math.round(trip.plannedDistance * 0.24).toString());
    setCompleteError('');
  };

  const handleCompleteTrip = async (e) => {
    e.preventDefault();
    setCompleteError('');

    try {
      const res = await fetchWithAuth(`/api/trips/${completeTripId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          actualDistance: parseFloat(actualDistance),
          fuelConsumed: parseFloat(fuelConsumed),
          fuelCost: parseFloat(fuelCost)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete trip');

      setCompleteTripId(null);
      loadData();
    } catch (err) {
      setCompleteError(err.message);
    }
  };

  const handleCancelTrip = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this trip?')) return;
    try {
      const res = await fetchWithAuth(`/api/trips/${id}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to cancel trip');
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  // Enforcing active selection rules for new trips
  const availableVehiclesForSelect = vehicles.filter(v => v.status === 'Available');
  
  const availableDriversForSelect = drivers.filter(d => {
    // Availability
    if (d.status !== 'Available') return false;
    // License Expiry Check
    const expiry = new Date(d.licenseExpiryDate);
    const today = new Date();
    return expiry >= today;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Action Header */}
      <div className="filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Active Dispatch Panel</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Construct routing, allocate cargo weights, and assign available crews.</p>
        </div>

        {isOperator && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            Plan New Trip
          </button>
        )}
      </div>

      {/* Trips Table */}
      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Trip ID</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Vehicle Allocated</th>
                <th>Assigned Crew</th>
                <th>Cargo Load</th>
                <th>Planned Route</th>
                <th>Odometer Return</th>
                <th>Status</th>
                {isOperator && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isOperator ? 10 : 9} style={{ textAlign: 'center', padding: '24px' }}>
                    Fetching transit dispatch logs...
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={isOperator ? 10 : 9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No trips planned or dispatched yet.
                  </td>
                </tr>
              ) : (
                trips.map(trip => (
                  <tr key={trip.id}>
                    <td>#{trip.id}</td>
                    <td>{trip.source}</td>
                    <td>{trip.destination}</td>
                    <td style={{ fontWeight: 600 }}>{trip.vehicle?.registrationNumber || 'Deleted Vehicle'}</td>
                    <td>{trip.driver?.name || 'Deleted Driver'}</td>
                    <td>{trip.cargoWeight} kg</td>
                    <td>{trip.plannedDistance} km</td>
                    <td>{trip.actualDistance ? `${trip.actualDistance} km` : 'Pending'}</td>
                    <td>
                      <span className={`badge badge-${trip.status.toLowerCase()}`}>
                        {trip.status}
                      </span>
                    </td>
                    {isOperator && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {trip.status === 'Draft' && (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => handleDispatchTrip(trip.id)}
                            >
                              <Navigation size={12} style={{ marginRight: '4px' }} />
                              Dispatch
                            </button>
                          )}
                          
                          {trip.status === 'Dispatched' && (
                            <>
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'var(--success)' }}
                                onClick={() => handleOpenCompleteModal(trip)}
                              >
                                <CheckCircle size={12} style={{ marginRight: '4px' }} />
                                Complete
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                                onClick={() => handleCancelTrip(trip.id)}
                              >
                                <XCircle size={12} style={{ marginRight: '4px' }} />
                                Cancel
                              </button>
                            </>
                          )}

                          {trip.status === 'Draft' && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                              onClick={() => handleCancelTrip(trip.id)}
                            >
                              Cancel
                            </button>
                          )}
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

      {/* Plan Trip Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Plan Dispatch Route</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateTrip}>
              <div className="form-row">
                <div className="form-group">
                  <label>Starting Source Location *</label>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="e.g. Warehouse North" 
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Destination Hub *</label>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="e.g. Depot East" 
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Select Available Vehicle *</label>
                <select 
                  className="select-input"
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Active Vehicle --</option>
                  {availableVehiclesForSelect.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} ({v.model} - Max Cap: {v.maxLoadCapacity} kg)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Assign Available Driver *</label>
                <select 
                  className="select-input"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Available Crew --</option>
                  {availableDriversForSelect.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} (Safety Score: {d.safetyScore} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cargo Weight (kg) *</label>
                  <input 
                    type="number" 
                    className="text-input" 
                    placeholder="e.g. 450" 
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Planned Route Distance (km) *</label>
                  <input 
                    type="number" 
                    className="text-input" 
                    placeholder="e.g. 120" 
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(e.target.value)}
                    required
                  />
                </div>
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
                  Draft Allocation Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {completeTripId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Finalize Transit Logs</h3>
              <button className="close-btn" onClick={() => setCompleteTripId(null)}>&times;</button>
            </div>

            <form onSubmit={handleCompleteTrip}>
              <div className="form-group">
                <label>Actual Distance Traveled (km) *</label>
                <input 
                  type="number" 
                  className="text-input" 
                  value={actualDistance}
                  onChange={(e) => setActualDistance(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fuel Consumed (Liters) *</label>
                  <input 
                    type="number" 
                    className="text-input" 
                    value={fuelConsumed}
                    onChange={(e) => setFuelConsumed(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fuel Cost ($)</label>
                  <input 
                    type="number" 
                    className="text-input" 
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                  />
                </div>
              </div>

              {completeError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
                  {completeError}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCompleteTripId(null)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--success)' }}>
                  Submit Log & Finalize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Trips;
