import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

// Default Seed Data
const DEFAULT_DB = {
  users: [
    { id: 1, email: "manager@triplogix.com", passwordHash: "$2a$10$BQ9ozO8xZpE8lsuthoOSAuSKfNCdfAWFTu.G4QyhVaTWhwKCo4I7W", name: "Sarah Manager", role: "Fleet Manager" },
    { id: 2, email: "driver@triplogix.com", passwordHash: "$2a$10$BQ9ozO8xZpE8lsuthoOSAuSKfNCdfAWFTu.G4QyhVaTWhwKCo4I7W", name: "Alex Mercer", role: "Driver" },
    { id: 3, email: "safety@triplogix.com", passwordHash: "$2a$10$BQ9ozO8xZpE8lsuthoOSAuSKfNCdfAWFTu.G4QyhVaTWhwKCo4I7W", name: "Officer James", role: "Safety Officer" },
    { id: 4, email: "finance@triplogix.com", passwordHash: "$2a$10$BQ9ozO8xZpE8lsuthoOSAuSKfNCdfAWFTu.G4QyhVaTWhwKCo4I7W", name: "David Analyst", role: "Financial Analyst" }
  ],
  vehicles: [
    { id: 1, registrationNumber: "VAN-01", model: "Ford Transit 2022", type: "Van", maxLoadCapacity: 1200, odometer: 45000, acquisitionCost: 35000, status: "Available", region: "North" },
    { id: 2, registrationNumber: "TRK-02", model: "Volvo FH16", type: "Truck", maxLoadCapacity: 15000, odometer: 180000, acquisitionCost: 110000, status: "On Trip", region: "East" },
    { id: 3, registrationNumber: "VAN-03", model: "Mercedes Sprinter", type: "Van", maxLoadCapacity: 15000, odometer: 62000, acquisitionCost: 48000, status: "In Shop", region: "North" },
    { id: 4, registrationNumber: "SED-04", model: "Toyota Prius", type: "Sedan", maxLoadCapacity: 400, odometer: 95000, acquisitionCost: 22000, status: "Available", region: "West" },
    { id: 5, registrationNumber: "TRK-05", model: "Scania R500", type: "Truck", maxLoadCapacity: 25000, odometer: 320000, acquisitionCost: 145000, status: "Retired", region: "South" }
  ],
  drivers: [
    { id: 1, name: "Alex Mercer", licenseNumber: "DL-99201", licenseCategory: "Class A", licenseExpiryDate: "2027-10-15", contactNumber: "555-0123", safetyScore: 92, status: "Available" },
    { id: 2, name: "Bob Harris", licenseNumber: "DL-88392", licenseCategory: "Class A", licenseExpiryDate: "2026-08-30", contactNumber: "555-0124", safetyScore: 85, status: "On Trip" },
    { id: 3, name: "Charlie Dunn", licenseNumber: "DL-11029", licenseCategory: "Class B", licenseExpiryDate: "2025-05-10", contactNumber: "555-0125", safetyScore: 74, status: "Available" }, // Expired
    { id: 4, name: "Dave Miller", licenseNumber: "DL-77382", licenseCategory: "Class C", licenseExpiryDate: "2028-02-14", contactNumber: "555-0126", safetyScore: 55, status: "Suspended" }
  ],
  trips: [
    { id: 1, source: "Warehouse North", destination: "Distribution Hub A", vehicleId: 2, driverId: 2, cargoWeight: 8000, plannedDistance: 120, actualDistance: null, fuelConsumed: null, status: "Dispatched", createdAt: "2026-07-10T10:00:00Z", dispatchedAt: "2026-07-10T10:30:00Z", completedAt: null },
    { id: 2, source: "Port West", destination: "Warehouse North", vehicleId: 1, driverId: 1, cargoWeight: 950, plannedDistance: 45, actualDistance: 45, fuelConsumed: 6, status: "Completed", createdAt: "2026-07-09T08:00:00Z", dispatchedAt: "2026-07-09T08:15:00Z", completedAt: "2026-07-09T10:00:00Z" }
  ],
  maintenanceLogs: [
    { id: 1, vehicleId: 3, description: "Scheduled Engine Overhaul", cost: 1800, startDate: "2026-07-11", endDate: null, status: "Active" },
    { id: 2, vehicleId: 1, description: "Brake Pads Replacement", cost: 450, startDate: "2026-06-15", endDate: "2026-06-16", status: "Closed" }
  ],
  fuelLogs: [
    { id: 1, vehicleId: 1, liters: 45, cost: 90, logDate: "2026-07-05" },
    { id: 2, vehicleId: 2, liters: 120, cost: 240, logDate: "2026-07-10" },
    { id: 3, vehicleId: 3, liters: 50, cost: 105, logDate: "2026-07-08" }
  ],
  expenses: [
    { id: 1, vehicleId: 1, tripId: 2, expenseType: "Toll", amount: 25, expenseDate: "2026-07-09" },
    { id: 2, vehicleId: 2, tripId: 1, expenseType: "Permitting", amount: 150, expenseDate: "2026-07-10" }
  ],
  documents: [
    { id: 1, name: "VN-05_Registration_2026.pdf", size: "1.2 MB", uploadDate: "2026-03-10" },
    { id: 2, name: "TR-01_Safety_Inspection.pdf", size: "2.4 MB", uploadDate: "2026-08-22" }
  ]
};

// Note: Password hash in seed data corresponds to "password123" hashed with bcryptjs.

class Database {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.save(DEFAULT_DB);
    }
  }

  read() {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error reading database file, using fallback data:', e);
      return DEFAULT_DB;
    }
  }

  save(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error writing database file:', e);
    }
  }

  getTable(table) {
    const data = this.read();
    return data[table] || [];
  }

  saveTable(table, rows) {
    const data = this.read();
    data[table] = rows;
    this.save(data);
  }

  getAll(table) {
    return this.getTable(table);
  }

  getById(table, id) {
    const rows = this.getTable(table);
    return rows.find(r => r.id === parseInt(id));
  }

  insert(table, record) {
    const rows = this.getTable(table);
    const nextId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    const newRecord = { id: nextId, ...record };
    rows.push(newRecord);
    this.saveTable(table, rows);
    return newRecord;
  }

  update(table, id, updates) {
    const rows = this.getTable(table);
    const index = rows.findIndex(r => r.id === parseInt(id));
    if (index === -1) return null;

    rows[index] = { ...rows[index], ...updates };
    this.saveTable(table, rows);
    return rows[index];
  }

  delete(table, id) {
    const rows = this.getTable(table);
    const index = rows.findIndex(r => r.id === parseInt(id));
    if (index === -1) return false;

    rows.splice(index, 1);
    this.saveTable(table, rows);
    return true;
  }
}

export const db = new Database();
