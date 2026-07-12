import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = 'transitops_secret_key_12345';

app.use(cors());
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});
app.use(express.json());

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Role Check Middleware
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized role' });
    }
    next();
  };
};

// --- AUTH ENDPOINTS ---

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const users = db.getAll('users');
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const validPassword = bcrypt.compareSync(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, role, password } = req.body;
  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const users = db.getAll('users');
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const newUser = db.insert('users', {
    email,
    passwordHash,
    name,
    role
  });

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name
    }
  });
});

// --- DASHBOARD ENDPOINTS ---

app.get('/api/dashboard', authenticateToken, (req, res) => {
  const vehicles = db.getAll('vehicles');
  const drivers = db.getAll('drivers');
  const trips = db.getAll('trips');

  const activeVehicles = vehicles.filter(v => v.status === 'On Trip').length;
  const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'In Shop').length;
  const totalNonRetired = vehicles.filter(v => v.status !== 'Retired').length;

  const activeTrips = trips.filter(t => t.status === 'Dispatched').length;
  const pendingTrips = trips.filter(t => t.status === 'Draft').length;
  const driversOnDuty = drivers.filter(d => d.status === 'On Trip').length;

  const fleetUtilization = totalNonRetired > 0 ? Math.round((activeVehicles / totalNonRetired) * 100) : 0;

  res.json({
    activeVehicles,
    availableVehicles,
    maintenanceVehicles,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    fleetUtilization
  });
});

// --- VEHICLES ENDPOINTS ---

app.get('/api/vehicles', authenticateToken, (req, res) => {
  res.json(db.getAll('vehicles'));
});

app.post('/api/vehicles', authenticateToken, checkRole(['Fleet Manager', 'Driver']), (req, res) => {
  const { registrationNumber, model, type, maxLoadCapacity, odometer, acquisitionCost, status, region } = req.body;

  if (!registrationNumber || !model || !type || !maxLoadCapacity || !odometer || !acquisitionCost) {
    return res.status(400).json({ error: 'Missing required vehicle fields' });
  }

  const vehicles = db.getAll('vehicles');
  const duplicate = vehicles.find(v => v.registrationNumber.toUpperCase() === registrationNumber.toUpperCase());
  if (duplicate) {
    return res.status(400).json({ error: 'Vehicle Registration Number must be unique' });
  }

  const newVehicle = db.insert('vehicles', {
    registrationNumber: registrationNumber.toUpperCase(),
    model,
    type,
    maxLoadCapacity: parseFloat(maxLoadCapacity),
    odometer: parseFloat(odometer),
    acquisitionCost: parseFloat(acquisitionCost),
    status: status || 'Available',
    region: region || 'Global'
  });

  res.status(201).json(newVehicle);
});

app.put('/api/vehicles/:id', authenticateToken, checkRole(['Fleet Manager', 'Driver']), (req, res) => {
  const { id } = req.params;
  const { registrationNumber, model, type, maxLoadCapacity, odometer, acquisitionCost, status, region } = req.body;

  const vehicle = db.getById('vehicles', id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  if (registrationNumber) {
    const vehicles = db.getAll('vehicles');
    const duplicate = vehicles.find(v => v.registrationNumber.toUpperCase() === registrationNumber.toUpperCase() && v.id !== parseInt(id));
    if (duplicate) {
      return res.status(400).json({ error: 'Vehicle Registration Number must be unique' });
    }
  }

  const updated = db.update('vehicles', id, {
    registrationNumber: registrationNumber ? registrationNumber.toUpperCase() : vehicle.registrationNumber,
    model: model || vehicle.model,
    type: type || vehicle.type,
    maxLoadCapacity: maxLoadCapacity ? parseFloat(maxLoadCapacity) : vehicle.maxLoadCapacity,
    odometer: odometer ? parseFloat(odometer) : vehicle.odometer,
    acquisitionCost: acquisitionCost ? parseFloat(acquisitionCost) : vehicle.acquisitionCost,
    status: status || vehicle.status,
    region: region || vehicle.region
  });

  res.json(updated);
});

app.delete('/api/vehicles/:id', authenticateToken, checkRole(['Fleet Manager', 'Driver']), (req, res) => {
  const success = db.delete('vehicles', req.params.id);
  if (!success) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ message: 'Vehicle deleted successfully' });
});

// --- DRIVERS ENDPOINTS ---

app.get('/api/drivers', authenticateToken, (req, res) => {
  res.json(db.getAll('drivers'));
});

app.post('/api/drivers', authenticateToken, checkRole(['Fleet Manager', 'Safety Officer', 'Driver']), (req, res) => {
  const { name, licenseNumber, licenseCategory, licenseExpiryDate, contactNumber, safetyScore, status } = req.body;

  if (!name || !licenseNumber || !licenseCategory || !licenseExpiryDate) {
    return res.status(400).json({ error: 'Missing required driver fields' });
  }

  const drivers = db.getAll('drivers');
  const duplicate = drivers.find(d => d.licenseNumber.toUpperCase() === licenseNumber.toUpperCase());
  if (duplicate) {
    return res.status(400).json({ error: 'Driver license number must be unique' });
  }

  const newDriver = db.insert('drivers', {
    name,
    licenseNumber: licenseNumber.toUpperCase(),
    licenseCategory,
    licenseExpiryDate,
    contactNumber: contactNumber || '',
    safetyScore: safetyScore ? parseFloat(safetyScore) : 100,
    status: status || 'Available'
  });

  res.status(201).json(newDriver);
});

app.put('/api/drivers/:id', authenticateToken, checkRole(['Fleet Manager', 'Safety Officer', 'Driver']), (req, res) => {
  const { id } = req.params;
  const { name, licenseNumber, licenseCategory, licenseExpiryDate, contactNumber, safetyScore, status } = req.body;

  const driver = db.getById('drivers', id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  if (licenseNumber) {
    const drivers = db.getAll('drivers');
    const duplicate = drivers.find(d => d.licenseNumber.toUpperCase() === licenseNumber.toUpperCase() && d.id !== parseInt(id));
    if (duplicate) {
      return res.status(400).json({ error: 'Driver license number must be unique' });
    }
  }

  const updated = db.update('drivers', id, {
    name: name || driver.name,
    licenseNumber: licenseNumber ? licenseNumber.toUpperCase() : driver.licenseNumber,
    licenseCategory: licenseCategory || driver.licenseCategory,
    licenseExpiryDate: licenseExpiryDate || driver.licenseExpiryDate,
    contactNumber: contactNumber || driver.contactNumber,
    safetyScore: safetyScore ? parseFloat(safetyScore) : driver.safetyScore,
    status: status || driver.status
  });

  res.json(updated);
});

app.delete('/api/drivers/:id', authenticateToken, checkRole(['Fleet Manager', 'Driver']), (req, res) => {
  const success = db.delete('drivers', req.params.id);
  if (!success) return res.status(404).json({ error: 'Driver not found' });
  res.json({ message: 'Driver deleted successfully' });
});

// --- TRIPS ENDPOINTS ---

app.get('/api/trips', authenticateToken, (req, res) => {
  const trips = db.getAll('trips');
  // Hydrate with Vehicle and Driver details
  const vehicles = db.getAll('vehicles');
  const drivers = db.getAll('drivers');

  const hydrated = trips.map(t => ({
    ...t,
    vehicle: vehicles.find(v => v.id === t.vehicleId),
    driver: drivers.find(d => d.id === t.driverId)
  }));

  res.json(hydrated);
});

app.post('/api/trips', authenticateToken, checkRole(['Fleet Manager', 'Driver']), (req, res) => {
  const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance } = req.body;

  if (!source || !destination || !vehicleId || !driverId || !cargoWeight || !plannedDistance) {
    return res.status(400).json({ error: 'Missing required trip fields' });
  }

  const vehicle = db.getById('vehicles', vehicleId);
  const driver = db.getById('drivers', driverId);

  if (!vehicle) return res.status(400).json({ error: 'Vehicle not found' });
  if (!driver) return res.status(400).json({ error: 'Driver not found' });

  // BUSINESS RULE: Retired or In Shop vehicles must never appear/be selected
  if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
    return res.status(400).json({ error: 'Selected vehicle is In Shop or Retired' });
  }

  // BUSINESS RULE: A driver or vehicle already marked On Trip cannot be assigned to another trip.
  if (vehicle.status === 'On Trip') {
    return res.status(400).json({ error: 'Selected vehicle is currently on another active trip' });
  }
  if (driver.status === 'On Trip') {
    return res.status(400).json({ error: 'Selected driver is currently on another active trip' });
  }

  // BUSINESS RULE: Drivers with expired licenses or Suspended status cannot be assigned to trips.
  if (driver.status === 'Suspended') {
    return res.status(400).json({ error: 'Selected driver is Suspended' });
  }
  const licenseExpiry = new Date(driver.licenseExpiryDate);
  const today = new Date();
  if (licenseExpiry < today) {
    return res.status(400).json({ error: 'Selected driver has an expired license' });
  }

  // BUSINESS RULE: Cargo Weight must not exceed the vehicle's maximum load capacity.
  if (parseFloat(cargoWeight) > vehicle.maxLoadCapacity) {
    return res.status(400).json({ error: `Cargo weight (${cargoWeight} kg) exceeds vehicle max capacity (${vehicle.maxLoadCapacity} kg)` });
  }

  // Calculate potential trip revenue
  const revenue = parseFloat(plannedDistance) * 12.5; // Custom business rule for demo: $12.5 per distance unit

  const newTrip = db.insert('trips', {
    source,
    destination,
    vehicleId: parseInt(vehicleId),
    driverId: parseInt(driverId),
    cargoWeight: parseFloat(cargoWeight),
    plannedDistance: parseFloat(plannedDistance),
    actualDistance: null,
    fuelConsumed: null,
    revenue,
    status: 'Draft',
    createdAt: new Date().toISOString(),
    dispatchedAt: null,
    completedAt: null
  });

  res.status(201).json(newTrip);
});

// Trip Dispatch
app.post('/api/trips/:id/dispatch', authenticateToken, checkRole(['Fleet Manager', 'Driver']), (req, res) => {
  const trip = db.getById('trips', req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'Draft') return res.status(400).json({ error: 'Only Draft trips can be dispatched' });

  const vehicle = db.getById('vehicles', trip.vehicleId);
  const driver = db.getById('drivers', trip.driverId);

  // Re-verify they are still available
  if (vehicle.status !== 'Available' || driver.status !== 'Available') {
    return res.status(400).json({ error: 'Vehicle or Driver is no longer available' });
  }

  // BUSINESS RULE: Dispatching a trip automatically changes both vehicle and driver status to On Trip
  db.update('vehicles', vehicle.id, { status: 'On Trip' });
  db.update('drivers', driver.id, { status: 'On Trip' });

  const updatedTrip = db.update('trips', trip.id, {
    status: 'Dispatched',
    dispatchedAt: new Date().toISOString()
  });

  res.json(updatedTrip);
});

// Trip Complete
app.post('/api/trips/:id/complete', authenticateToken, checkRole(['Fleet Manager', 'Driver']), (req, res) => {
  const { actualDistance, fuelConsumed, fuelCost } = req.body;
  if (!actualDistance || !fuelConsumed) {
    return res.status(400).json({ error: 'Actual distance and fuel consumed are required to complete a trip' });
  }

  const trip = db.getById('trips', req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'Dispatched') return res.status(400).json({ error: 'Only Dispatched trips can be completed' });

  const vehicle = db.getById('vehicles', trip.vehicleId);
  const driver = db.getById('drivers', trip.driverId);

  // Update vehicle odometer
  const newOdometer = vehicle.odometer + parseFloat(actualDistance);
  db.update('vehicles', vehicle.id, {
    status: 'Available',
    odometer: newOdometer
  });

  // BUSINESS RULE: Completing a trip automatically changes both the vehicle and driver status back to Available.
  db.update('drivers', driver.id, { status: 'Available' });

  // Update Trip
  const updatedTrip = db.update('trips', trip.id, {
    status: 'Completed',
    actualDistance: parseFloat(actualDistance),
    fuelConsumed: parseFloat(fuelConsumed),
    completedAt: new Date().toISOString()
  });

  // Automatically log fuel details if cost is provided
  const costVal = fuelCost ? parseFloat(fuelCost) : parseFloat(fuelConsumed) * 2.0; // standard $2 per liter
  db.insert('fuelLogs', {
    vehicleId: vehicle.id,
    liters: parseFloat(fuelConsumed),
    cost: costVal,
    logDate: new Date().toISOString().split('T')[0]
  });

  res.json(updatedTrip);
});

// Trip Cancel
app.post('/api/trips/:id/cancel', authenticateToken, checkRole(['Fleet Manager', 'Driver']), (req, res) => {
  const trip = db.getById('trips', req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'Dispatched' && trip.status !== 'Draft') {
    return res.status(400).json({ error: 'Cannot cancel a completed or already cancelled trip' });
  }

  // BUSINESS RULE: Cancelling a dispatched trip restores the vehicle and driver to Available.
  if (trip.status === 'Dispatched') {
    db.update('vehicles', trip.vehicleId, { status: 'Available' });
    db.update('drivers', trip.driverId, { status: 'Available' });
  }

  const updatedTrip = db.update('trips', trip.id, {
    status: 'Cancelled'
  });

  res.json(updatedTrip);
});

// --- MAINTENANCE ENDPOINTS ---

app.get('/api/maintenance', authenticateToken, (req, res) => {
  const logs = db.getAll('maintenanceLogs');
  const vehicles = db.getAll('vehicles');

  const hydrated = logs.map(l => ({
    ...l,
    vehicle: vehicles.find(v => v.id === l.vehicleId)
  }));
  res.json(hydrated);
});

app.post('/api/maintenance', authenticateToken, checkRole(['Fleet Manager']), (req, res) => {
  const { vehicleId, description, startDate } = req.body;

  if (!vehicleId || !description || !startDate) {
    return res.status(400).json({ error: 'Missing required maintenance fields' });
  }

  const vehicle = db.getById('vehicles', vehicleId);
  if (!vehicle) return res.status(400).json({ error: 'Vehicle not found' });

  // BUSINESS RULE: Creating an active maintenance record automatically changes vehicle status to In Shop
  db.update('vehicles', vehicleId, { status: 'In Shop' });

  const newLog = db.insert('maintenanceLogs', {
    vehicleId: parseInt(vehicleId),
    description,
    startDate,
    endDate: null,
    cost: 0,
    status: 'Active'
  });

  res.status(201).json(newLog);
});

app.post('/api/maintenance/:id/close', authenticateToken, checkRole(['Fleet Manager']), (req, res) => {
  const { endDate, cost } = req.body;
  if (!endDate || cost === undefined) {
    return res.status(400).json({ error: 'End date and cost are required' });
  }

  const log = db.getById('maintenanceLogs', req.params.id);
  if (!log) return res.status(404).json({ error: 'Maintenance record not found' });

  const vehicle = db.getById('vehicles', log.vehicleId);

  // BUSINESS RULE: Closing maintenance restores the vehicle to Available (unless retired).
  const nextStatus = vehicle.status === 'Retired' ? 'Retired' : 'Available';
  db.update('vehicles', vehicle.id, { status: nextStatus });

  const updatedLog = db.update('maintenanceLogs', log.id, {
    status: 'Closed',
    endDate,
    cost: parseFloat(cost)
  });

  // Log as general expense
  db.insert('expenses', {
    vehicleId: vehicle.id,
    tripId: null,
    expenseType: 'Maintenance',
    amount: parseFloat(cost),
    expenseDate: endDate
  });

  res.json(updatedLog);
});

// --- FUEL & EXPENSES ENDPOINTS ---

app.get('/api/fuel', authenticateToken, (req, res) => {
  const logs = db.getAll('fuelLogs');
  const vehicles = db.getAll('vehicles');
  res.json(logs.map(l => ({ ...l, vehicle: vehicles.find(v => v.id === l.vehicleId) })));
});

app.post('/api/fuel', authenticateToken, checkRole(['Fleet Manager', 'Driver', 'Financial Analyst']), (req, res) => {
  const { vehicleId, liters, cost, logDate } = req.body;
  if (!vehicleId || !liters || !cost || !logDate) {
    return res.status(400).json({ error: 'Missing required fuel log fields' });
  }

  const newLog = db.insert('fuelLogs', {
    vehicleId: parseInt(vehicleId),
    liters: parseFloat(liters),
    cost: parseFloat(cost),
    logDate
  });

  res.status(201).json(newLog);
});

app.get('/api/expenses', authenticateToken, (req, res) => {
  const expenses = db.getAll('expenses');
  const vehicles = db.getAll('vehicles');
  res.json(expenses.map(e => ({ ...e, vehicle: vehicles.find(v => v.id === e.vehicleId) })));
});

app.post('/api/expenses', authenticateToken, checkRole(['Fleet Manager', 'Financial Analyst']), (req, res) => {
  const { vehicleId, tripId, expenseType, amount, expenseDate } = req.body;
  if (!vehicleId || !expenseType || !amount || !expenseDate) {
    return res.status(400).json({ error: 'Missing required expense fields' });
  }

  const newExpense = db.insert('expenses', {
    vehicleId: parseInt(vehicleId),
    tripId: tripId ? parseInt(tripId) : null,
    expenseType,
    amount: parseFloat(amount),
    expenseDate
  });

  res.status(201).json(newExpense);
});

// --- ANALYTICS & REPORTS ENDPOINTS ---

app.get('/api/reports', authenticateToken, (req, res) => {
  const vehicles = db.getAll('vehicles');
  const trips = db.getAll('trips').filter(t => t.status === 'Completed');
  const fuelLogs = db.getAll('fuelLogs');
  const maintenanceLogs = db.getAll('maintenanceLogs');

  const report = vehicles.map(vehicle => {
    // 1. Operational Fuel Costs
    const vehicleFuel = fuelLogs.filter(f => f.vehicleId === vehicle.id);
    const totalFuelCost = vehicleFuel.reduce((sum, f) => sum + f.cost, 0);
    const totalLiters = vehicleFuel.reduce((sum, f) => sum + f.liters, 0);

    // 2. Maintenance Costs
    const vehicleMaint = maintenanceLogs.filter(m => m.vehicleId === vehicle.id);
    const totalMaintCost = vehicleMaint.reduce((sum, m) => sum + m.cost, 0);

    // Total Operational Cost (Fuel + Maintenance) per vehicle
    const totalOperationalCost = totalFuelCost + totalMaintCost;

    // 3. Distance & Fuel Efficiency (Distance / Fuel)
    const vehicleTrips = trips.filter(t => t.vehicleId === vehicle.id);
    const totalDistance = vehicleTrips.reduce((sum, t) => sum + (t.actualDistance || 0), 0);
    const fuelEfficiency = totalLiters > 0 ? (totalDistance / totalLiters).toFixed(2) : 'N/A';

    // 4. Vehicle ROI: (Revenue - (Maint + Fuel)) / Acquisition Cost
    const totalRevenue = vehicleTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const netReturn = totalRevenue - totalOperationalCost;
    const roi = vehicle.acquisitionCost > 0 
      ? ((netReturn / vehicle.acquisitionCost) * 100).toFixed(2) 
      : '0.00';

    return {
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      model: vehicle.model,
      type: vehicle.type,
      acquisitionCost: vehicle.acquisitionCost,
      totalDistance,
      totalFuelCost,
      totalMaintCost,
      totalOperationalCost,
      fuelEfficiency,
      totalRevenue,
      roi: parseFloat(roi)
    };
  });

  res.json(report);
});

// CSV Export Endpoint
app.get('/api/reports/export', authenticateToken, checkRole(['Fleet Manager', 'Financial Analyst']), (req, res) => {
  const vehicles = db.getAll('vehicles');
  const trips = db.getAll('trips').filter(t => t.status === 'Completed');
  const fuelLogs = db.getAll('fuelLogs');
  const maintenanceLogs = db.getAll('maintenanceLogs');

  let csvContent = "Registration Number,Model,Type,Acquisition Cost ($),Total Distance,Total Fuel Liters,Fuel Cost ($),Maintenance Cost ($),Total Operational Cost ($),Total Revenue ($),ROI (%)\n";

  vehicles.forEach(vehicle => {
    const vehicleFuel = fuelLogs.filter(f => f.vehicleId === vehicle.id);
    const totalFuelCost = vehicleFuel.reduce((sum, f) => sum + f.cost, 0);
    const totalLiters = vehicleFuel.reduce((sum, f) => sum + f.liters, 0);

    const vehicleMaint = maintenanceLogs.filter(m => m.vehicleId === vehicle.id);
    const totalMaintCost = vehicleMaint.reduce((sum, m) => sum + m.cost, 0);

    const totalOperationalCost = totalFuelCost + totalMaintCost;

    const vehicleTrips = trips.filter(t => t.vehicleId === vehicle.id);
    const totalDistance = vehicleTrips.reduce((sum, t) => sum + (t.actualDistance || 0), 0);

    const totalRevenue = vehicleTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const netReturn = totalRevenue - totalOperationalCost;
    const roi = vehicle.acquisitionCost > 0 
      ? ((netReturn / vehicle.acquisitionCost) * 100).toFixed(2) 
      : '0.00';

    csvContent += `"${vehicle.registrationNumber}","${vehicle.model}","${vehicle.type}",${vehicle.acquisitionCost},${totalDistance},${totalLiters},${totalFuelCost},${totalMaintCost},${totalOperationalCost},${totalRevenue},${roi}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=triplogix_fleet_report.csv');
  res.status(200).send(csvContent);
});
// --- DOCUMENTS ENDPOINTS (Simulated Document Management) ---

app.get('/api/documents', authenticateToken, (req, res) => {
  res.json(db.getAll('documents'));
});

app.post('/api/documents', authenticateToken, (req, res) => {
  const { name, size, uploadDate } = req.body;
  if (!name || !size) {
    return res.status(400).json({ error: 'Name and size are required' });
  }
  const newDoc = db.insert('documents', {
    name,
    size,
    uploadDate: uploadDate || new Date().toISOString().split('T')[0]
  });
  res.status(201).json(newDoc);
});

app.delete('/api/documents/:id', authenticateToken, (req, res) => {
  const success = db.delete('documents', req.params.id);
  if (!success) return res.status(404).json({ error: 'Document not found' });
  res.json({ message: 'Document deleted successfully' });
});

app.listen(PORT, () => {
  console.log(`TripLogix Backend Server is running on port ${PORT}`);
});
