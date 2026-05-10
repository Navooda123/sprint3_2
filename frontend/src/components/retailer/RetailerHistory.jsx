import React from 'react';
import { formatDateTime } from '../../utils/formatters';
import { Download } from 'lucide-react';

const RetailerHistory = ({ history }) => {
  
  const exportToCSV = () => {
    if (history.length === 0) return;
    
    const headers = ['Date', 'Product', 'Old Qty', 'New Qty', 'Reason', 'Type'];
    const csvRows = [headers.join(',')];
    
    history.forEach(entry => {
      const row = [
        formatDateTime(entry.date),
        `"${entry.productName}"`, // escape quotes in case
        entry.oldQty,
        entry.newQty,
        `"${entry.reason}"`,
        `"${entry.type}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock_History_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3>Stock Adjustment History</h3>
        <button 
          className="btn btn-primary flex items-center gap-2" 
          onClick={exportToCSV}
          disabled={history.length === 0}
        >
          <Download size={18} /> Export to CSV
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Product</th>
              <th>Old Qty</th>
              <th>New Qty</th>
              <th>Reason</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-5 text-muted">
                  No stock adjustments recorded in this session.
                </td>
              </tr>
            ) : (
              history.map(entry => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.date)}</td>
                  <td style={{ fontWeight: 600 }}>{entry.productName}</td>
                  <td className="text-muted">{entry.oldQty}</td>
                  <td>
                    {String(entry.newQty).startsWith('+') ? (
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>{entry.newQty}</span>
                    ) : (
                      entry.newQty
                    )}
                  </td>
                  <td>{entry.reason}</td>
                  <td>
                    <span className={`badge ${entry.type === 'Manual Adjustment' ? 'badge-warning' : 'badge-success'}`}>
                      {entry.type}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RetailerHistory;
