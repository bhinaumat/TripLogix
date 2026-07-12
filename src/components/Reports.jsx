import React, { useState, useEffect } from 'react';
import { Download, BarChart2, PieChart, TrendingUp, DollarSign, Printer, Cloud, Trash2, FileText, Upload } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  Legend,
  PieChart as RechartsPieChart,
  Pie
} from 'recharts';

function Reports({ user, fetchWithAuth }) {
  const [report, setReport] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const resReport = await fetchWithAuth('/api/reports');
      const reportData = await resReport.json();
      setReport(reportData);

      const resFuel = await fetchWithAuth('/api/fuel');
      const fuelData = await resFuel.json();
      setFuelLogs(fuelData);

      const resExp = await fetchWithAuth('/api/expenses');
      const expData = await resExp.json();
      setExpenses(expData);

      const resDocs = await fetchWithAuth('/api/documents');
      const docsData = await resDocs.json();
      setDocuments(docsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const handleExportCSV = async () => {
    try {
      const res = await fetchWithAuth('/api/reports/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `triplogix_fleet_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Failed to export CSV: ' + e.message);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Convert file size to formatted string (e.g. 1.2 MB)
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const today = new Date().toISOString().split('T')[0];

    try {
      const res = await fetchWithAuth('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          name: file.name,
          size: sizeInMB,
          uploadDate: today
        })
      });

      if (!res.ok) throw new Error('Failed to upload document');

      // Refresh documents
      const resDocs = await fetchWithAuth('/api/documents');
      const docsData = await resDocs.json();
      setDocuments(docsData);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFileDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this compliance document?')) return;
    try {
      const res = await fetchWithAuth(`/api/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete document');

      // Refresh documents
      const resDocs = await fetchWithAuth('/api/documents');
      const docsData = await resDocs.json();
      setDocuments(docsData);
    } catch (err) {
      alert(err.message);
    }
  };

  // Math Calculations for Dashboard Summary cards
  const totalRevenue = report.reduce((sum, v) => sum + v.totalRevenue, 0);
  const totalCosts = report.reduce((sum, v) => sum + v.totalOperationalCost, 0);
  const netEarnings = totalRevenue - totalCosts;
  const totalAcqCost = report.reduce((sum, v) => sum + v.acquisitionCost, 0);
  const overallROI = totalAcqCost > 0 ? ((netEarnings / totalAcqCost) * 100).toFixed(2) : '0.00';

  // Chart Data preparation: Bar Chart (Costs vs Revenue)
  const barChartData = report.map(v => ({
    name: v.registrationNumber,
    Revenue: v.totalRevenue,
    OperationalCost: v.totalOperationalCost
  }));

  // Chart Data preparation: Pie Chart (Expense Type breakdown)
  const fuelExpenseSum = fuelLogs.reduce((sum, f) => sum + f.cost, 0);
  const otherExpensesGrouped = expenses.reduce((acc, curr) => {
    acc[curr.expenseType] = (acc[curr.expenseType] || 0) + curr.amount;
    return acc;
  }, {});

  const pieChartData = [
    { name: 'Fuel Costs', value: fuelExpenseSum },
    { name: 'Maintenance', value: otherExpensesGrouped['Maintenance'] || 0 },
    { name: 'Tolls', value: otherExpensesGrouped['Toll'] || 0 },
    { name: 'Permitting', value: otherExpensesGrouped['Permitting'] || 0 },
    { name: 'Fines', value: otherExpensesGrouped['Fine'] || 0 }
  ].filter(item => item.value > 0);

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Hidden Header only visible on standard A4 paper printing */}
      <div className="print-header" style={{ display: 'none', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>TripLogix</h1>
            <p style={{ color: '#475569', fontSize: '0.8rem' }}>Fleet Analytics & ROI Performance Statement</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
            <div>Date Generated: {new Date().toLocaleDateString()}</div>
            <div>Generated by: {user.name} ({user.role})</div>
          </div>
        </div>
      </div>

      {/* Visual Analytics KPI Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div className="kpis-grid" style={{ margin: 0, flex: 1 }}>
          <div className="card kpi-card" style={{ padding: '16px 20px' }}>
            <div className="kpi-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', width: '38px', height: '38px', fontSize: '1.2rem' }}>
              <TrendingUp size={18} />
            </div>
            <div className="kpi-details">
              <span className="kpi-title" style={{ fontSize: '0.7rem' }}>Total Cargo Earnings</span>
              <span className="kpi-value" style={{ fontSize: '1.35rem' }}>${totalRevenue.toLocaleString()}</span>
            </div>
          </div>

          <div className="card kpi-card" style={{ padding: '16px 20px' }}>
            <div className="kpi-icon" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', width: '38px', height: '38px', fontSize: '1.2rem' }}>
              <DollarSign size={18} />
            </div>
            <div className="kpi-details">
              <span className="kpi-title" style={{ fontSize: '0.7rem' }}>Fleet Operating Cost</span>
              <span className="kpi-value" style={{ fontSize: '1.35rem' }}>${totalCosts.toLocaleString()}</span>
            </div>
          </div>

          <div className="card kpi-card" style={{ padding: '16px 20px' }}>
            <div className="kpi-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', width: '38px', height: '38px', fontSize: '1.2rem' }}>
              <TrendingUp size={18} />
            </div>
            <div className="kpi-details">
              <span className="kpi-title" style={{ fontSize: '0.7rem' }}>Average Return Rate (ROI)</span>
              <span className="kpi-value" style={{ fontSize: '1.35rem' }}>{overallROI}%</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handlePrintPDF}>
            <Printer size={16} style={{ marginRight: '4px' }} /> Print / PDF Export
          </button>
          <button className="btn btn-primary" onClick={handleExportCSV}>
            <Download size={16} style={{ marginRight: '4px' }} /> Export CSV Spreadsheet
          </button>
        </div>
      </div>

      {/* 1. TOP CARD: Fleet ROI Performance Matrix */}
      <div className="card">
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Fleet ROI Performance Matrix</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Overview of fleet financial ratios and return on asset investments.</p>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Acquisition Cost</th>
                <th>Total Fuel Cost</th>
                <th>Total Maintenance</th>
                <th>Est. Lifetime Revenue</th>
                <th>Total Operational Cost</th>
                <th>ROI (%)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '16px' }}>Loading financial matrix...</td>
                </tr>
              ) : report.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '16px' }}>No active vehicle data.</td>
                </tr>
              ) : (
                report.map(row => {
                  const isNeg = parseFloat(row.roi) < 0;
                  return (
                    <tr key={row.vehicleId}>
                      <td style={{ fontWeight: 600 }}>{row.registrationNumber}</td>
                      <td>{row.type}</td>
                      <td>${row.acquisitionCost.toLocaleString()}</td>
                      <td>${row.totalFuelCost.toLocaleString()}</td>
                      <td>${row.totalMaintCost.toLocaleString()}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>${row.totalRevenue.toLocaleString()}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 600 }}>${row.totalOperationalCost.toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: isNeg ? 'var(--danger)' : 'var(--success)' }}>
                        {row.roi}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. BOTTOM ROW: Split column uploader and fuel efficiency tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        
        {/* Bottom Left Card: Fuel Efficiency Logs */}
        <div className="card" style={{ flex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Fuel Efficiency Logs (km / Liter)</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Fuel utilization audit rates calculated from distance completed and fuel logging.</p>
          </div>

          <div className="table-container">
            <table className="custom-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Total Distance (km)</th>
                  <th>Total Fuel Used (L)</th>
                  <th>Efficiency (km/L)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '16px' }}>Loading fuel efficiency audits...</td>
                  </tr>
                ) : report.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No logs logged.</td>
                  </tr>
                ) : (
                  report.map(row => (
                    <tr key={row.vehicleId}>
                      <td style={{ fontWeight: 600 }}>{row.registrationNumber} ({row.model.split(' ')[0]})</td>
                      <td>{row.totalDistance.toLocaleString()} km</td>
                      <td>{fuelLogs.filter(f => f.vehicleId === row.vehicleId).reduce((sum, f) => sum + f.liters, 0)} Liters</td>
                      <td style={{ fontWeight: 700, color: row.fuelEfficiency === 'N/A' ? 'var(--text-muted)' : 'var(--primary)' }}>
                        {row.fuelEfficiency !== 'N/A' ? `${row.fuelEfficiency} km/L` : '0.00 km/L'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Right Card: Document Manager (Uploader) */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Fleet Document Manager (Compliance)</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Simulate document uploads for vehicle records and registrations.</p>
          </div>

          {/* Interactive drop zone wrapper */}
          <div style={{ noPrint: true }}>
            <label 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                border: '2px dashed var(--border-color)',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              className="upload-zone"
            >
              <input 
                type="file" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
                accept=".pdf,.png,.jpg,.jpeg"
              />
              <div style={{
                width: '44px',
                height: '44px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Upload size={20} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                  Click to upload compliance document
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                  Supports PDF, PNG, JPG up to 10MB
                </span>
              </div>
            </label>
          </div>

          {/* Uploaded Documents List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                No compliance documents uploaded yet.
              </div>
            ) : (
              documents.map(doc => (
                <div 
                  key={doc.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText size={20} style={{ color: 'var(--primary)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{doc.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        Uploaded: {doc.uploadDate} | Size: {doc.size}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleFileDelete(doc.id)} 
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 3. BOTTOM SECTION: Charts (Visible in UI, Hidden during print) */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '8px' }}>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
          <h4 style={{ fontWeight: 700, fontSize: '1.15rem' }}>Visual Data Projections</h4>
        </div>
        
        <div className="analytics-grid" style={{ marginTop: 0 }}>
          <div className="card">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
              <BarChart2 size={18} style={{ color: 'var(--primary)' }} />
              <h5 style={{ fontWeight: 700 }}>Revenue vs Operational Costs per Vehicle</h5>
            </div>
            
            <div style={{ width: '100%', height: '260px' }}>
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
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
              <PieChart size={18} style={{ color: 'var(--info)' }} />
              <h5 style={{ fontWeight: 700 }}>Fleet Expense Split</h5>
            </div>
            
            <div style={{ width: '100%', height: '260px', display: 'flex', flexDirection: 'column', justifyItems: 'center' }}>
              {pieChartData.length === 0 ? (
                <div className="chart-placeholder-container">Waiting for logs...</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="70%">
                    <RechartsPieChart>
                      <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Cost']} contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', fontSize: '10px', marginTop: '10px' }}>
                    {pieChartData.map((item, index) => (
                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '10px', height: '10px', backgroundColor: PIE_COLORS[index % PIE_COLORS.length], borderRadius: '2px' }}></div>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.name} (${Math.round(item.value)})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Reports;
