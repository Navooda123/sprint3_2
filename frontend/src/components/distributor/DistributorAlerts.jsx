import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const DistributorAlerts = () => {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/distributor/alerts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch (error) {
      toast.error('Failed to load stock alerts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>Live Stock Alerts</h3>
        <button className="btn btn-outline" onClick={fetchAlerts}>Refresh Feed</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-muted">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p className="text-muted">No low stock alerts in your coverage area.</p>
        ) : (
          alerts.map(alert => {
            const isCritical = alert.quantity <= 10;
            const urgencyColor = isCritical ? 'var(--danger)' : 'var(--warning)';
            
            return (
              <div key={alert.id} className="card" style={{ borderLeft: `4px solid ${urgencyColor}` }}>
                <div className="flex justify-between items-start mb-2">
                  <span className="badge" style={{ backgroundColor: urgencyColor, color: '#fff', animation: isCritical ? 'pulse 1.5s infinite' : 'none' }}>
                    {isCritical ? 'CRITICAL (≤10%)' : 'LOW (≤25%)'}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>{alert.user?.role}</span>
                </div>
                
                <h4 style={{ margin: '0 0 5px 0' }}>{alert.user?.name}</h4>
                <div className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                  <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {alert.user?.district}
                </div>

                <div style={{ backgroundColor: 'var(--bg-color)', padding: '12px', borderRadius: '4px', border: `1px solid ${urgencyColor}40` }}>
                  <div style={{ fontWeight: 600 }}>{alert.product?.name}</div>
                  <div className="flex justify-between mt-1 text-sm">
                    <span className="text-muted">Current Stock:</span>
                    <strong style={{ color: urgencyColor }}>{alert.quantity} units left</strong>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DistributorAlerts;
