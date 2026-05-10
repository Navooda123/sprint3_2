import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const MasterStockMonitor = () => {
  const { token } = useAuth();
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/factory/stock', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStockData(await res.json());
      }
    } catch (error) {
      toast.error('Failed to fetch master stock data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminReorder = async (item) => {
    try {
      const res = await fetch('http://localhost:5000/api/factory/reorder', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          recipientId: item.userId,
          productId: item.productId,
          quantity: 100 - item.quantity // Dispatch enough to reach 100
        })
      });

      if (res.ok) {
        toast.success(`Reorder dispatched to ${item.User?.name}`);
        fetchStock();
      } else {
        toast.error('Failed to dispatch reorder');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };


  const filteredStock = stockData.filter(item => {
    if (filter === 'All') return true;
    if (filter === 'Low') return item.quantity <= (item.product?.stockThreshold || 25);
    return item.User?.role === filter;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>Master Stock Monitor</h3>
        <div className="flex gap-2">
          <select className="form-control" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 'auto' }}>
            <option value="All">All Locations</option>
            <option value="Outlet">Outlets Only</option>
            <option value="Low">Low Stock ({'<'} 25%)</option>
          </select>
          <button className="btn btn-outline" onClick={fetchStock}>Refresh</button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-center text-muted">Loading stock data...</p>
        ) : (
          <table className="w-full text-left" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-2">Location Name</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">District</th>
                <th className="pb-2">Product</th>
                <th className="pb-2" style={{ width: '30%' }}>Stock Level</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStock.map(item => {
                const maxStock = 100;
                const percentage = Math.min((item.quantity / maxStock) * 100, 100);
                const threshold = item.product?.stockThreshold || 25;
                const isLow = percentage <= threshold;
                
                let barColor = 'var(--success)';
                if (percentage <= 50 && percentage > threshold) barColor = 'var(--warning)';
                if (isLow) barColor = 'var(--danger)';

                return (
                  <tr key={item.id} style={{ borderTop: '1px solid var(--border-color)', backgroundColor: isLow ? 'rgba(204,0,0,0.02)' : 'transparent' }}>
                    <td className="py-3" style={{ fontWeight: 500 }}>{item.User?.name}</td>
                    <td><span className="badge">{item.User?.role}</span></td>
                    <td>{item.User?.district}</td>
                    <td>{item.product?.name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: barColor, transition: 'width 0.3s ease' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', width: '35px', color: isLow ? 'var(--danger)' : 'var(--text-main)', fontWeight: isLow ? 'bold' : 'normal' }}>
                          {item.quantity}
                        </span>
                      </div>
                    </td>
                    <td className="text-right">
                      {isLow ? (
                        <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleAdminReorder(item)}>Initiate Reorder</button>
                      ) : (
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Adjust</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {filteredStock.length === 0 && !loading && (
          <p className="text-center text-muted mt-4">No stock records found matching filters.</p>
        )}
      </div>
    </div>
  );
};

export default MasterStockMonitor;
