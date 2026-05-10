import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/formatters';

// We receive history via a prop from the parent which receives it from the OutletStock ref
// For now we'll use a simple local mock since the backend doesn't have a separate history table
const OutletHistory = ({ history = [] }) => {
  const { user } = useAuth();

  const exportCSV = () => {
    const headers = ['Date/Time', 'Product', 'Old Qty', 'New Qty', 'Reason', 'Adjusted By'];
    const rows = history.map(h => [
      formatDateTime(h.date), h.product, h.oldQty, h.newQty, h.reason, h.adjustedBy
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3>Stock Adjustment History</h3>
        <button className="btn btn-outline" onClick={exportCSV}>Export to CSV</button>
      </div>

      <table className="w-full text-left" style={{ fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ color: 'var(--text-muted)' }}>
            <th className="pb-2">Date/Time (Colombo)</th>
            <th className="pb-2">Product</th>
            <th className="pb-2">Old Qty</th>
            <th className="pb-2">New Qty</th>
            <th className="pb-2">Change</th>
            <th className="pb-2">Reason</th>
            <th className="pb-2">Adjusted By</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center text-muted py-6">
                No adjustments recorded this session. Stock changes will appear here.
              </td>
            </tr>
          ) : (
            history.map(h => {
              const change = h.newQty - h.oldQty;
              return (
                <tr key={h.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td className="py-3">{formatDateTime(h.date)}</td>
                  <td style={{ fontWeight: 500 }}>{h.product}</td>
                  <td>{h.oldQty}</td>
                  <td>{h.newQty}</td>
                  <td style={{ color: change >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {change >= 0 ? '+' : ''}{change}
                  </td>
                  <td>{h.reason}</td>
                  <td>{h.adjustedBy}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OutletHistory;
