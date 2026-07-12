import React, { useState, useEffect } from 'react';
import { Plus, Fuel, DollarSign, Wrench, Calculator } from 'lucide-react';

function Expenses({ user, fetchWithAuth, mode }) {
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelError, setFuelError] = useState('');

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expVehicleId, setExpVehicleId] = useState('');
  const [expType, setExpType] = useState('Toll');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expError, setExpError] = useState('');

  const isWriteAuthorized = user?.role === 'Fleet Manager' || user?.role === 'Financial Analyst';

  const loadData = async () => {
    try {
      setLoading(true);
      const resFuel = await fetchWithAuth('/api/fuel');
      const fuelData = await resFuel.json();
      setFuelLogs(fuelData);

      const resExp = await fetchWithAuth('/api/expenses');
      const expData = await resExp.json();
      setExpenses(expData);

      const resVeh = await fetchWithAuth('/api/vehicles');
      const vehData = await resVeh.json();
      setVehicles(vehData);

      const resMaint = await fetchWithAuth('/api/maintenance');
      const maintData = await resMaint.json();
      setMaintenanceLogs(maintData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mode]);

  const handleSaveFuel = async (e) => {
    e.preventDefault();
    setFuelError('');

    if (!fuelVehicleId || !fuelLiters || !fuelCost || !fuelDate) {
      setFuelError('All fields are required');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/fuel', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: parseInt(fuelVehicleId),
          liters: parseFloat(fuelLiters),
          cost: parseFloat(fuelCost),
          logDate: fuelDate
        })
      });

      if (!res.ok) throw new Error('Failed to record fuel log');

      setIsFuelModalOpen(false);
      loadData();
    } catch (err) {
      setFuelError(err.message);
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setExpError('');

    if (!expVehicleId || !expAmount || !expDate) {
      setExpError('All fields are required');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: parseInt(expVehicleId),
          expenseType: expType,
          amount: parseFloat(expAmount),
          expenseDate: expDate
        })
      });

      if (!res.ok) throw new Error('Failed to log expense');

      setIsExpenseModalOpen(false);
      loadData();
    } catch (err) {
      setExpError(err.message);
    }
  };

  // Math Calculations for Dashboard Summary cards
  const totalLiters = fuelLogs.reduce((sum, f) => sum + f.liters, 0);
  const totalFuelCost = fuelLogs.reduce((sum, f) => sum + f.cost, 0);
  const totalExpCost = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalMaintCost = maintenanceLogs.reduce((sum, m) => sum + m.cost, 0);
  const activeMaintCount = maintenanceLogs.filter(m => m.status === 'Active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 1. HEADER DESCRIPTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {mode === 'fuel' && (
            <>
              <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Fuel Consumption Review</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Audits vehicle fuel intake logs, invoice costs, and refill dates across the fleet.</p>
            </>
          )}
          {mode === 'maint_costs' && (
            <>
              <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Maintenance Cost Audits</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Reviews repair expenses, spare part costs, and workshop active statuses.</p>
            </>
          )}
          {mode === 'op_expenses' && (
            <>
              <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Operational Expenses</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Audits toll gates, permitting, fines, and general transit operational overheads.</p>
            </>
          )}
        </div>

        {isWriteAuthorized && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {mode === 'fuel' && (
              <button className="btn btn-primary" onClick={() => setIsFuelModalOpen(true)}>
                <Plus size={16} style={{ marginRight: '4px' }} /> Record Fuel Log
              </button>
            )}
            {mode === 'op_expenses' && (
              <button className="btn btn-primary" onClick={() => setIsExpenseModalOpen(true)}>
                <Plus size={16} style={{ marginRight: '4px' }} /> Log Operating Expense
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. KPI SUMMARIES */}
      <div className="kpis-grid" style={{ margin: 0 }}>
        {mode === 'fuel' && (
          <>
            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
                <Fuel size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Total Fuel Quantity</span>
                <span className="kpi-value">{totalLiters.toLocaleString()} Liters</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                <DollarSign size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Fuel Expenditures</span>
                <span className="kpi-value">${totalFuelCost.toLocaleString()}</span>
              </div>
            </div>
          </>
        )}

        {mode === 'maint_costs' && (
          <>
            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                <Wrench size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Total Maintenance Cost</span>
                <span className="kpi-value">${totalMaintCost.toLocaleString()}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
                <Calculator size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Active Repair Orders</span>
                <span className="kpi-value">{activeMaintCount} Active</span>
              </div>
            </div>
          </>
        )}

        {mode === 'op_expenses' && (
          <>
            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                <DollarSign size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Total Operational Overhead</span>
                <span className="kpi-value">${totalExpCost.toLocaleString()}</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                <Calculator size={24} />
              </div>
              <div className="kpi-details">
                <span className="kpi-title">Logged Transactions</span>
                <span className="kpi-value">{expenses.length} records</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. CORE LEDGERS */}
      <div className="card">
        {mode === 'fuel' && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Fuel size={18} style={{ color: 'var(--info)' }} />
              <h4 style={{ fontWeight: 700 }}>Fuel Ingestion Ledger</h4>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Vehicle</th>
                    <th>Refueled Quantity (Liters)</th>
                    <th>Invoice Cost ($)</th>
                    <th>Refill Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '16px' }}>Loading fuel reports...</td>
                    </tr>
                  ) : fuelLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No fuel entries logged yet.</td>
                    </tr>
                  ) : (
                    fuelLogs.map(log => (
                      <tr key={log.id}>
                        <td>#{log.id}</td>
                        <td style={{ fontWeight: 600 }}>{log.vehicle?.registrationNumber} ({log.vehicle?.model})</td>
                        <td>{log.liters} L</td>
                        <td style={{ fontWeight: 600 }}>${log.cost.toLocaleString()}</td>
                        <td>{log.logDate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {mode === 'maint_costs' && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Wrench size={18} style={{ color: 'var(--warning)' }} />
              <h4 style={{ fontWeight: 700 }}>Workshop Repair Expense Ledger</h4>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>Vehicle</th>
                    <th>Work Description</th>
                    <th>Repair Cost</th>
                    <th>Start Date</th>
                    <th>Resolution Date</th>
                    <th>Workshop Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '16px' }}>Loading repair costs...</td>
                    </tr>
                  ) : maintenanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No maintenance logs found.</td>
                    </tr>
                  ) : (
                    maintenanceLogs.map(m => (
                      <tr key={m.id}>
                        <td>#{m.id}</td>
                        <td style={{ fontWeight: 600 }}>{m.vehicle?.registrationNumber}</td>
                        <td>{m.description}</td>
                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>${m.cost.toLocaleString()}</td>
                        <td>{m.startDate}</td>
                        <td>{m.endDate || '-'}</td>
                        <td>
                          <span className={`badge badge-${m.status === 'Active' ? 'dispatched' : 'completed'}`} style={{ fontSize: '0.7rem' }}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {mode === 'op_expenses' && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <DollarSign size={18} style={{ color: 'var(--danger)' }} />
              <h4 style={{ fontWeight: 700 }}>Operating Expenses Ledger</h4>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Expense ID</th>
                    <th>Vehicle</th>
                    <th>Expense Category</th>
                    <th>Transaction Cost ($)</th>
                    <th>Billing Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '16px' }}>Loading fee books...</td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No operational expenses logged yet.</td>
                    </tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id}>
                        <td>#{exp.id}</td>
                        <td style={{ fontWeight: 600 }}>{exp.vehicle?.registrationNumber} ({exp.vehicle?.model})</td>
                        <td>
                          <span className={`badge badge-${exp.expenseType === 'Maintenance' ? 'shop' : exp.expenseType === 'Fine' ? 'cancelled' : 'draft'}`} style={{ fontSize: '0.7rem' }}>
                            {exp.expenseType}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--danger)' }}>${exp.amount.toLocaleString()}</td>
                        <td>{exp.expenseDate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Log Fuel Modal */}
      {isFuelModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Record Fuel Ingestion</h3>
              <button className="close-btn" onClick={() => setIsFuelModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSaveFuel}>
              <div className="form-group">
                <label>Select Fleet Vehicle *</label>
                <select 
                  className="select-input"
                  value={fuelVehicleId}
                  onChange={(e) => setFuelVehicleId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} ({v.model})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fuel Quantity (Liters) *</label>
                  <input 
                    type="number" 
                    className="text-input" 
                    placeholder="e.g. 55"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Total Invoice Cost ($) *</label>
                  <input 
                    type="number" 
                    className="text-input" 
                    placeholder="e.g. 110"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Log Ingestion Date *</label>
                <input 
                  type="date" 
                  className="text-input" 
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  required
                />
              </div>

              {fuelError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>{fuelError}</div>}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsFuelModalOpen(false)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary">
                  Log Fuel Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log General Expense Modal */}
      {isExpenseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Log General Operating Expense</h3>
              <button className="close-btn" onClick={() => setIsExpenseModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSaveExpense}>
              <div className="form-group">
                <label>Select Fleet Vehicle *</label>
                <select 
                  className="select-input"
                  value={expVehicleId}
                  onChange={(e) => setExpVehicleId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} ({v.model})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Expense Type *</label>
                  <select className="select-input" value={expType} onChange={(e) => setExpType(e.target.value)}>
                    <option value="Toll">Toll Road</option>
                    <option value="Permitting">Permitting & Licensing</option>
                    <option value="Fine">Traffic Fine</option>
                    <option value="Maintenance">Ad-hoc Maintenance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Transaction Amount ($) *</label>
                  <input 
                    type="number" 
                    className="text-input" 
                    placeholder="e.g. 35"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Transaction Date *</label>
                <input 
                  type="date" 
                  className="text-input" 
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  required
                />
              </div>

              {expError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>{expError}</div>}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsExpenseModalOpen(false)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary">
                  Record Expense Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Expenses;
