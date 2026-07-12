import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  MapPin, 
  Play, 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  DollarSign, 
  AlertOctagon, 
  TrendingDown,
  Clipboard,
  User
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

function Dashboard({ user, fetchWithAuth, setActiveTab }) {
  const [kpis, setKpis] = useState({
    activeVehicles: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    activeTrips: 0,
    pendingTrips: 0,
    driversOnDuty: 0,
    fleetUtilization: 0
  });

  const [activeTripsList, setActiveTripsList] = useState([]);
  const [allTripsList, setAllTripsList] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [financials, setFinancials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (for Fleet Manager)
  const [vehicleType, setVehicleType] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');

  // Simulation variables
  const [simulationTicks, setSimulationTicks] = useState({});

  // Completion Form modal state
  const [completeModalTrip, setCompleteModalTrip] = useState(null);
  const [actualDistance, setActualDistance] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [completeError, setCompleteError] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch KPIs
      const resKpi = await fetchWithAuth('/api/dashboard');
      const kpiData = await resKpi.json();
      setKpis(kpiData);

      // Fetch Trips
      const resTrips = await fetchWithAuth('/api/trips');
      const tripsData = await resTrips.json();
      setAllTripsList(tripsData);
      setActiveTripsList(tripsData.filter(t => t.status === 'Dispatched'));

      // Fetch Vehicles
      const resVehicles = await fetchWithAuth('/api/vehicles');
      const vehiclesData = await resVehicles.json();
      setVehicles(vehiclesData);

      // Fetch Drivers
      const resDrivers = await fetchWithAuth('/api/drivers');
      const driversData = await resDrivers.json();
      setDrivers(driversData);

      // Fetch Financial reports
      const resFinances = await fetchWithAuth('/api/reports');
      const financesData = await resFinances.json();
      setFinancials(financesData);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const tickSimulation = (tripId, plannedDistance) => {
    setSimulationTicks(prev => {
      const current = prev[tripId] || 0;
      if (current >= 100) return prev;
      const step = Math.min(100, current + Math.floor(Math.random() * 20) + 15);
      return { ...prev, [tripId]: step };
    });
  };

  const handleOpenCompleteModal = (trip) => {
    setCompleteModalTrip(trip);
    setActualDistance(trip.plannedDistance.toString());
    setFuelConsumed(Math.round(trip.plannedDistance * 0.12).toString());
    setFuelCost(Math.round(trip.plannedDistance * 0.24).toString());
    setCompleteError('');
  };

  const handleCompleteTrip = async (e) => {
    e.preventDefault();
    setCompleteError('');
    if (!actualDistance || !fuelConsumed) {
      setCompleteError('Please fill in actual distance and fuel consumed');
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/trips/${completeModalTrip.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          actualDistance: parseFloat(actualDistance),
          fuelConsumed: parseFloat(fuelConsumed),
          fuelCost: parseFloat(fuelCost)
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to complete trip');
      }

      setSimulationTicks(prev => {
        const copy = { ...prev };
        delete copy[completeModalTrip.id];
        return copy;
      });

      setCompleteModalTrip(null);
      loadDashboardData();
    } catch (err) {
      setCompleteError(err.message);
    }
  };

  const handleCancelTrip = async (tripId) => {
    if (!window.confirm('Are you sure you want to cancel this active trip? Both driver and vehicle will be returned to Available status.')) return;
    try {
      const res = await fetchWithAuth(`/api/trips/${tripId}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to cancel trip');
      loadDashboardData();
    } catch (e) {
      alert(e.message);
    }
  };

  const getProgressVal = (tripId) => simulationTicks[tripId] || 0;

  // Filter vehicles (for Fleet Manager)
  const filteredVehicles = vehicles.filter(v => {
    if (vehicleType !== 'All' && v.type !== vehicleType) return false;
    if (statusFilter !== 'All' && v.status !== statusFilter) return false;
    if (regionFilter !== 'All' && v.region !== regionFilter) return false;
    return true;
  });

  // Role Checks
  const isManager = user?.role === 'Fleet Manager';
  const isDriver = user?.role === 'Driver';
  const isSafety = user?.role === 'Safety Officer';
  const isAnalyst = user?.role === 'Financial Analyst';

  // -----------------------------------------------------
  // 1. DRIVER DASHBOARD CALCULATIONS
  // -----------------------------------------------------
  const myTrips = allTripsList.filter(t => t.driver?.name === user?.name);
  const myActiveTrips = myTrips.filter(t => t.status === 'Dispatched');
  const myDraftTrips = myTrips.filter(t => t.status === 'Draft');
  const myCompletedTrips = myTrips.filter(t => t.status === 'Completed');
  const myDriverRecord = drivers.find(d => d.name === user?.name);
  
  // Find current active vehicle details for driver
  const myCurrentTrip = myActiveTrips[0];
  const myVehicle = myCurrentTrip ? myCurrentTrip.vehicle : null;

  // -----------------------------------------------------
  // 2. SAFETY OFFICER DASHBOARD CALCULATIONS
  // -----------------------------------------------------
  const avgSafetyScore = drivers.length > 0 
    ? Math.round(drivers.reduce((sum, d) => sum + d.safetyScore, 0) / drivers.length)
    : 0;

  const expiredLicensesList = drivers.filter(d => new Date(d.licenseExpiryDate) < new Date());
  const expiringLicensesList = drivers.filter(d => {
    const expiry = new Date(d.licenseExpiryDate);
    const today = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(today.getDate() + 30);
    return expiry >= today && expiry <= thirtyDays;
  });

  const lowSafetyDrivers = drivers.filter(d => d.safetyScore < 70);

  // -----------------------------------------------------
  // 3. FINANCIAL ANALYST DASHBOARD CALCULATIONS
  // -----------------------------------------------------
  const totalRevenue = financials.reduce((sum, v) => sum + v.totalRevenue, 0);
  const totalCosts = financials.reduce((sum, v) => sum + v.totalOperationalCost, 0);
  const netEarnings = totalRevenue - totalCosts;
  const totalAcqCost = financials.reduce((sum, v) => sum + v.acquisitionCost, 0);
  const overallROI = totalAcqCost > 0 ? ((netEarnings / totalAcqCost) * 100).toFixed(2) : '0.00';

  // Top 3 highest operating cost vehicles
  const topCostVehicles = [...financials]
    .sort((a, b) => b.totalOperationalCost - a.totalOperationalCost)
    .slice(0, 3);

  const barChartData = financials.map(v => ({
    name: v.registrationNumber,
    Revenue: v.totalRevenue,
    OperationalCost: v.totalOperationalCost
  }));

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard details...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* ============================================================ */}
      {/* ROLE: FLEET MANAGER DASHBOARD                                */}
      {/* ============================================================ */}
      {isManager && (
        <>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Fleet Operations Center</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Fleet Manager: Oversees fleet assets, maintenance, vehicle lifecycle, and operational efficiency.
            </p>
          </div>

          {/* KPIs */}
          <div className="kpis-grid">
            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                <Activity size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Active Vehicles</span>
                <span className="kpi-value">{kpis.activeVehicles}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                <CheckCircle size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Available Vehicles</span>
                <span className="kpi-value">{kpis.availableVehicles}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                <AlertTriangle size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">In Shop</span>
                <span className="kpi-value">{kpis.maintenanceVehicles}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
                <MapPin size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Active Trips</span>
                <span className="kpi-value">{kpis.activeTrips}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                <Clock size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Pending Trips</span>
                <span className="kpi-value">{kpis.pendingTrips}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                <Users size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Drivers On Duty</span>
                <span className="kpi-value">{kpis.driversOnDuty}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
                <TrendingUp size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Fleet Utilization</span>
                <span className="kpi-value">{kpis.fleetUtilization}%</span>
              </div>
            </div>
          </div>

          {/* Telemetry Simulator Hub */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Active Dispatch Telemetry Hub</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Simulate real-time vehicle movement and complete active shipments.</p>
              </div>
              <span className="badge badge-trip">Live Tracker</span>
            </div>

            {activeTripsList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                <MapPin size={36} style={{ marginBottom: '12px', opacity: 0.6 }} />
                <p>No active trips are currently dispatched.</p>
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setActiveTab('trips')}>
                  Go Dispatch a Trip
                </button>
              </div>
            ) : (
              <div className="sim-grid">
                {activeTripsList.map(trip => {
                  const progress = getProgressVal(trip.id);
                  return (
                    <div key={trip.id} className="sim-card">
                      <div className="sim-card-header">
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          Trip #{trip.id} ({trip.vehicle?.registrationNumber})
                        </span>
                        <span className="badge badge-dispatched" style={{ fontSize: '0.7rem' }}>
                          {progress >= 100 ? 'Arrived' : 'In Transit'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>Route:</strong> 
                          <span>{trip.source}</span>
                          <span>&rarr;</span>
                          <span>{trip.destination}</span>
                        </div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Driver:</strong> {trip.driver?.name} (Safety: {trip.driver?.safetyScore})</div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Cargo Capacity:</strong> {trip.cargoWeight} kg / {trip.vehicle?.maxLoadCapacity} kg</div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Planned Route:</strong> {trip.plannedDistance} km</div>
                      </div>

                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                          <span>Simulation Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        {progress < 100 ? (
                          <button 
                            className="btn btn-secondary" 
                            style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => tickSimulation(trip.id, trip.plannedDistance)}
                          >
                            <Play size={14} style={{ marginRight: '4px' }} />
                            Simulate Tick
                          </button>
                        ) : (
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'var(--success)' }}
                            onClick={() => handleOpenCompleteModal(trip)}
                          >
                            Complete Shipment
                          </button>
                        )}
                        
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                          onClick={() => handleCancelTrip(trip.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Operations Summary Logs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginTop: '24px', marginBottom: '32px' }}>
            {/* Pending Trips (Draft) Log */}
            <div className="card" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontWeight: 700 }}>Pending Dispatch Logs (Drafts)</h4>
                <span className="badge badge-draft">{kpis.pendingTrips} Pending</span>
              </div>
              
              <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Cargo</th>
                      <th>Planned Dist.</th>
                      <th>Vehicle & Crew</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTripsList.filter(t => t.status === 'Draft').length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>No pending draft allocations.</td>
                      </tr>
                    ) : (
                      allTripsList.filter(t => t.status === 'Draft').map(trip => (
                        <tr key={trip.id}>
                          <td style={{ fontWeight: 600 }}>{trip.source} &rarr; {trip.destination}</td>
                          <td>{trip.cargoWeight} kg</td>
                          <td>{trip.plannedDistance} km</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{trip.vehicle?.registrationNumber}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{trip.driver?.name}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Drivers On Duty (On Trip) Log */}
            <div className="card" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontWeight: 700 }}>Active Crew Logs (On Duty)</h4>
                <span className="badge badge-trip">{kpis.driversOnDuty} Active</span>
              </div>

              <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>License</th>
                      <th>Safety Score</th>
                      <th>Current Vehicle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.filter(d => d.status === 'On Duty' || d.status === 'On Trip').length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>No drivers currently on trip duty.</td>
                      </tr>
                    ) : (
                      drivers.filter(d => d.status === 'On Duty' || d.status === 'On Trip').map(d => {
                        const activeTrip = allTripsList.find(t => t.driverId === d.id && t.status === 'Dispatched');
                        return (
                          <tr key={d.id}>
                            <td style={{ fontWeight: 600 }}>{d.name}</td>
                            <td>{d.licenseNumber}</td>
                            <td style={{ fontWeight: 700, color: d.safetyScore < 70 ? 'var(--danger)' : 'var(--success)' }}>{d.safetyScore} pts</td>
                            <td style={{ fontWeight: 600 }}>{activeTrip?.vehicle?.registrationNumber || 'In Transit'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Real-time Fleet Monitor */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Real-time Fleet Monitor</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Overview of all registered vehicles, active status, and regions.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <select className="select-input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                  <option value="All">All Types</option>
                  <option value="Truck">Trucks</option>
                  <option value="Van">Vans</option>
                  <option value="Sedan">Sedans</option>
                </select>

                <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="In Shop">In Shop</option>
                  <option value="Retired">Retired</option>
                </select>

                <select className="select-input" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                  <option value="All">All Regions</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                </select>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Registration</th>
                    <th>Model</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Odometer</th>
                    <th>Region</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No matching vehicles found.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map(vehicle => (
                      <tr key={vehicle.id}>
                        <td style={{ fontWeight: 600 }}>{vehicle.registrationNumber}</td>
                        <td>{vehicle.model}</td>
                        <td>{vehicle.type}</td>
                        <td>{vehicle.maxLoadCapacity} kg</td>
                        <td>{vehicle.odometer.toLocaleString()} km</td>
                        <td>{vehicle.region}</td>
                        <td>
                          <span className={`badge badge-${vehicle.status.toLowerCase().replace(' ', '')}`}>
                            {vehicle.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* ROLE: DRIVER DASHBOARD                                       */}
      {/* ============================================================ */}
      {isDriver && (
        <>
          {/* Driver KPIs */}
          <div className="kpis-grid">
            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                <Clock size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">My Active Trips</span>
                <span className="kpi-value">{myActiveTrips.length}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                <Clipboard size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">My Draft Allocation Plans</span>
                <span className="kpi-value">{myDraftTrips.length}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                <CheckCircle size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">My Completed Trips</span>
                <span className="kpi-value">{myCompletedTrips.length}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
                <ShieldCheck size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">My Safety Rating</span>
                <span className="kpi-value" style={{ color: (myDriverRecord?.safetyScore || 100) < 70 ? 'var(--danger)' : 'var(--success)' }}>
                  {myDriverRecord?.safetyScore || 100} pts
                </span>
              </div>
            </div>
          </div>

          {/* Driver Profile Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} style={{ color: 'var(--primary)' }} />
                My Profile & Credentials
              </h3>
              <span className={`badge badge-${myDriverRecord?.status?.toLowerCase().replace(' ', '') || 'available'}`}>
                {myDriverRecord?.status || 'Available'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Full Name</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>License Number</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{myDriverRecord?.licenseNumber || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>License Category</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{myDriverRecord?.licenseCategory || 'Class A'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>License Expiration</span>
                <span style={{ fontWeight: 600, color: new Date(myDriverRecord?.licenseExpiryDate) < new Date() ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {myDriverRecord?.licenseExpiryDate || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Contact Info</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{myDriverRecord?.contactNumber || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Safety Rating</span>
                <span style={{ fontWeight: 700, color: (myDriverRecord?.safetyScore || 100) < 70 ? 'var(--danger)' : 'var(--success)' }}>
                  {myDriverRecord?.safetyScore || 100} pts
                </span>
              </div>
            </div>
          </div>

          {/* Pending Allocation Plans (Accept & Dispatch Work) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>My Pending Work Allocations</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Review draft schedules assigned to you and accept the dispatch to start.</p>
              </div>
              <span className="badge badge-draft" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>Pending</span>
            </div>

            {myDraftTrips.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                You have no pending draft assignments needing your signature/approval.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myDraftTrips.map(trip => (
                  <div key={trip.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', gap: '16px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Trip #{trip.id}: {trip.source} &rarr; {trip.destination}
                      </div>
                      <div><strong>Vehicle:</strong> {trip.vehicle?.registrationNumber} ({trip.vehicle?.model})</div>
                      <div><strong>Cargo Load:</strong> {trip.cargoWeight} kg | <strong>Planned Distance:</strong> {trip.plannedDistance} km</div>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                      onClick={async () => {
                        try {
                          const res = await fetchWithAuth(`/api/trips/${trip.id}/dispatch`, { method: 'POST' });
                          if (!res.ok) {
                            const errData = await res.json();
                            throw new Error(errData.error || 'Failed to accept trip');
                          }
                          loadDashboardData();
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                    >
                      Accept & Start Trip
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Telemetry Simulator for Driver's own trips */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>My Active Shipments</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Log travel telemetry ticks and complete your active transits.</p>
              </div>
              <span className="badge badge-trip">In Transit</span>
            </div>

            {myActiveTrips.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                <MapPin size={36} style={{ marginBottom: '12px', opacity: 0.6 }} />
                <p>You have no active trips currently dispatched.</p>
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setActiveTab('trips')}>
                  Create/Dispatch a Trip
                </button>
              </div>
            ) : (
              <div className="sim-grid">
                {myActiveTrips.map(trip => {
                  const progress = getProgressVal(trip.id);
                  return (
                    <div key={trip.id} className="sim-card" style={{ width: '100%' }}>
                      <div className="sim-card-header">
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          Trip #{trip.id} ({trip.vehicle?.registrationNumber} - {trip.vehicle?.model})
                        </span>
                        <span className="badge badge-dispatched" style={{ fontSize: '0.7rem' }}>
                          {progress >= 100 ? 'Arrived' : 'In Transit'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>Routing:</strong> 
                          <span>{trip.source}</span>
                          <span>&rarr;</span>
                          <span>{trip.destination}</span>
                        </div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Allocated Weight:</strong> {trip.cargoWeight} kg (Vehicle limit: {trip.vehicle?.maxLoadCapacity} kg)</div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Planned Route Distance:</strong> {trip.plannedDistance} km</div>
                      </div>

                      <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                          <span>Shipment Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        {progress < 100 ? (
                          <button 
                            className="btn btn-secondary" 
                            style={{ flex: 1, padding: '8px' }}
                            onClick={() => tickSimulation(trip.id, trip.plannedDistance)}
                          >
                            <Play size={14} style={{ marginRight: '4px' }} />
                            Tick Telemetry Progress
                          </button>
                        ) : (
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, padding: '8px', backgroundColor: 'var(--success)' }}
                            onClick={() => handleOpenCompleteModal(trip)}
                          >
                            Submit Logs & Complete Trip
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Driver's Trip History */}
          <div className="card">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>My Trip Logs</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>A chronological history of your planned, active, or finalized shipments.</p>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Trip ID</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Cargo Load</th>
                    <th>Planned Distance</th>
                    <th>Odometer Return</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myTrips.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        You have not been assigned to any trips yet.
                      </td>
                    </tr>
                  ) : (
                    myTrips.map(trip => (
                      <tr key={trip.id}>
                        <td>#{trip.id}</td>
                        <td>{trip.source} &rarr; {trip.destination}</td>
                        <td>{trip.vehicle?.registrationNumber}</td>
                        <td>{trip.cargoWeight} kg</td>
                        <td>{trip.plannedDistance} km</td>
                        <td>{trip.actualDistance ? `${trip.actualDistance} km` : '-'}</td>
                        <td>
                          <span className={`badge badge-${trip.status.toLowerCase()}`}>
                            {trip.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* ROLE: SAFETY OFFICER DASHBOARD                               */}
      {/* ============================================================ */}
      {isSafety && (
        <>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Safety & Compliance Center</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Safety Officer: Ensures driver compliance, tracks license validity, and monitors safety scores.
            </p>
          </div>

          {/* Safety KPIs */}
          <div className="kpis-grid">
            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                <ShieldCheck size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Average Safety score</span>
                <span className="kpi-value">{avgSafetyScore} pts</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: expiredLicensesList.length > 0 ? 'var(--danger-light)' : 'var(--bg-tertiary)', color: expiredLicensesList.length > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                <AlertOctagon size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Expired Licenses</span>
                <span className="kpi-value">{expiredLicensesList.length}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: expiringLicensesList.length > 0 ? 'var(--warning-light)' : 'var(--bg-tertiary)', color: expiringLicensesList.length > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                <AlertTriangle size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Lic. Expiring (30 days)</span>
                <span className="kpi-value">{expiringLicensesList.length}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: lowSafetyDrivers.length > 0 ? 'var(--danger-light)' : 'var(--success-light)', color: lowSafetyDrivers.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                <ShieldAlert size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Safety Score Alerts</span>
                <span className="kpi-value">{lowSafetyDrivers.length}</span>
              </div>
            </div>
          </div>

          {/* Compliance & License Warnings Board */}
          <div className="card">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Compliance & License Expiration Warning Board</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Active monitoring of driver credentials requiring renewal or suspension audits.</p>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Driver Name</th>
                    <th>License Number</th>
                    <th>Expiry Date</th>
                    <th>Contact</th>
                    <th>Indicator Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredLicensesList.length === 0 && expiringLicensesList.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--success)', padding: '20px', fontWeight: 600 }}>
                        All driver licenses are fully valid and compliant.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {expiredLicensesList.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.name}</td>
                          <td>{d.licenseNumber} ({d.licenseCategory})</td>
                          <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{d.licenseExpiryDate}</td>
                          <td>{d.contactNumber}</td>
                          <td>
                            <span className="badge badge-cancelled" style={{ fontSize: '0.7rem' }}>Expired</span>
                          </td>
                          <td>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger-light)' }} onClick={() => setActiveTab('licenses')}>
                              Suspend Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                      {expiringLicensesList.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.name}</td>
                          <td>{d.licenseNumber} ({d.licenseCategory})</td>
                          <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{d.licenseExpiryDate}</td>
                          <td>{d.contactNumber}</td>
                          <td>
                            <span className="badge badge-shop" style={{ fontSize: '0.7rem' }}>Expiring Soon</span>
                          </td>
                          <td>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setActiveTab('licenses')}>
                              Edit Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Safety Performance review list */}
          <div className="card">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Crew Safety Audits</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Overview of safety ratings and compliance actions across the crew.</p>
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
                   {drivers.length === 0 ? (
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
                          <td style={{ color: isLowSafety ? 'var(--danger)' : d.safetyScore >= 85 ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                            {d.safetyScore || 100} pts
                          </td>
                          <td>
                            <span className={`badge badge-${d.status.toLowerCase().replace(' ', '')}`}>{d.status}</span>
                          </td>
                          <td>
                            {isLowSafety ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                                <ShieldAlert size={14} /> Attention Needed
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                                <ShieldCheck size={14} /> Compliant
                              </span>
                            )}
                          </td>
                          <td>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.75rem' }} 
                              onClick={() => setActiveTab('safety_audits')}
                            >
                              Review Action
                            </button>
                          </td>
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

      {/* ============================================================ */}
      {/* ROLE: FINANCIAL ANALYST DASHBOARD                            */}
      {/* ============================================================ */}
      {isAnalyst && (
        <>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Financial Audit & Profitability Center</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Reviews operational expenses, fuel consumption, maintenance costs, and profitability.
            </p>
          </div>

          {/* Analyst KPIs */}
          <div className="kpis-grid">
            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                <TrendingUp size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Cargo Revenue</span>
                <span className="kpi-value">${totalRevenue.toLocaleString()}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                <DollarSign size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Operational Costs</span>
                <span className="kpi-value">${totalCosts.toLocaleString()}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: netEarnings >= 0 ? 'var(--success-light)' : 'var(--danger-light)', color: netEarnings >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                <Activity size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Net Margin</span>
                <span className="kpi-value">${netEarnings.toLocaleString()}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: parseFloat(overallROI) >= 0 ? 'var(--primary-light)' : 'var(--danger-light)', color: parseFloat(overallROI) >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                {parseFloat(overallROI) >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Fleet ROI Rating</span>
                <span className="kpi-value">{overallROI}%</span>
              </div>
            </div>
          </div>

          {/* Revenue vs Operating Costs Chart */}
          <div className="card">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
              <Activity size={18} style={{ color: 'var(--primary)' }} />
              <h4 style={{ fontWeight: 700 }}>Fleet Asset Earnings vs Operating Overhead</h4>
            </div>

            <div style={{ width: '100%', height: '240px' }}>
              {financials.length === 0 ? (
                <div className="chart-placeholder-container">Waiting for financial calculations...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Revenue" fill="var(--success)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="OperationalCost" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top 3 Highest Operating Cost Vehicles */}
          <div className="card">
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Top Cost Leakages</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Highest operational cost vehicles in the fleet requiring audits.</p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setActiveTab('reports')}>
                View Full Book
              </button>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Registration</th>
                    <th>Model</th>
                    <th>Type</th>
                    <th>Fuel Costs</th>
                    <th>Maintenance Costs</th>
                    <th>Total Operating Cost</th>
                    <th>Revenue Generated</th>
                    <th>ROI Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topCostVehicles.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No operating expenses logged yet.
                      </td>
                    </tr>
                  ) : (
                    topCostVehicles.map(vehicle => {
                      const isNeg = parseFloat(vehicle.roi) < 0;
                      return (
                        <tr key={vehicle.vehicleId}>
                          <td style={{ fontWeight: 600 }}>{vehicle.registrationNumber}</td>
                          <td>{vehicle.model}</td>
                          <td>{vehicle.type}</td>
                          <td>${vehicle.totalFuelCost.toLocaleString()}</td>
                          <td>${vehicle.totalMaintCost.toLocaleString()}</td>
                          <td style={{ fontWeight: 600, color: 'var(--danger)' }}>${vehicle.totalOperationalCost.toLocaleString()}</td>
                          <td style={{ fontWeight: 600, color: 'var(--success)' }}>${vehicle.totalRevenue.toLocaleString()}</td>
                          <td style={{ fontWeight: 700, color: isNeg ? 'var(--danger)' : 'var(--success)' }}>
                            {vehicle.roi}%
                          </td>
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

      {/* Complete Trip Modal (Shared Component) */}
      {completeModalTrip && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Complete Shipment (Trip #{completeModalTrip.id})</h3>
              <button className="close-btn" onClick={() => setCompleteModalTrip(null)}>&times;</button>
            </div>
            
            <form onSubmit={handleCompleteTrip}>
              <div className="form-group">
                <label>Actual Distance Traveled (km)</label>
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
                  <label>Fuel Consumed (Liters)</label>
                  <input 
                    type="number" 
                    className="text-input"
                    value={fuelConsumed}
                    onChange={(e) => setFuelConsumed(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Fuel Total Cost ($)</label>
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
                <button type="button" className="btn btn-secondary" onClick={() => setCompleteModalTrip(null)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--success)' }}>
                  Submit Log & Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
