import React from 'react';
import { formatDateTime } from '../../utils/formatters';
import { Truck, CheckCircle, Clock } from 'lucide-react';

const DistributorPerformance = ({ deliveries }) => {
  const completedDeliveries = deliveries.filter(d => d.status === 'Completed' || d.status === 'Delivered');
  
  // Mock performance metrics
  const onTimeRate = 96.5;
  const avgTime = 3.2;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="card flex items-center gap-4">
          <div style={{ padding: '15px', backgroundColor: 'rgba(46,125,50,0.1)', borderRadius: '50%', color: 'var(--success)' }}>
            <CheckCircle size={32} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>On-Time Delivery Rate</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 600 }}>{onTimeRate}%</div>
          </div>
        </div>
        
        <div className="card flex items-center gap-4">
          <div style={{ padding: '15px', backgroundColor: 'rgba(0,90,156,0.1)', borderRadius: '50%', color: 'var(--info)' }}>
            <Truck size={32} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Total Completed</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 600 }}>{completedDeliveries.length}</div>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div style={{ padding: '15px', backgroundColor: 'rgba(237,108,2,0.1)', borderRadius: '50%', color: 'var(--warning)' }}>
            <Clock size={32} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Avg Delivery Time</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 600 }}>{avgTime} hrs</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4">Delivery History</h3>
        <table className="w-full text-left" style={{ fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)' }}>
              <th className="pb-2">Date Completed</th>
              <th className="pb-2">Delivery ID</th>
              <th className="pb-2">Recipient</th>
              <th className="pb-2">District</th>
              <th className="pb-2">Performance</th>
              <th className="pb-2 text-right">Proof</th>
            </tr>
          </thead>
          <tbody>
            {completedDeliveries.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-6 text-muted">No completed deliveries yet.</td>
              </tr>
            ) : (
              completedDeliveries.map(d => (
                <tr key={d.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td className="py-3">{formatDateTime(d.updatedAt)}</td>
                  <td style={{ fontWeight: 500 }}>{d.orderNumber}</td>
                  <td>{d.Recipient?.name}</td>
                  <td>{d.Recipient?.district || 'N/A'}</td>
                  <td>
                    <span className="badge" style={{ backgroundColor: 'var(--success)' }}>On-Time</span>
                  </td>
                  <td className="text-right">
                    <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>View Photo</button>
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

export default DistributorPerformance;
