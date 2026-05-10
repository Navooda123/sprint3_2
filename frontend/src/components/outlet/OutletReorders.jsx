import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const STATUS_INFO = {
  Pending:   { color: 'var(--warning)', label: 'Waiting for factory approval' },
  Approved:  { color: 'var(--info)',    label: 'Approved' },
  Dispatched:{ color: 'var(--primary)', label: 'Dispatched – en route' },
  'In Transit': { color: 'var(--primary)', label: 'In Transit' },
  Delivered: { color: 'var(--success)', label: 'Arrived at outlet' },
  Completed: { color: 'var(--success)', label: 'Delivery Accepted' },
};

const OutletReorders = ({ refreshStats }) => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/outlet/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOrders(await res.json());
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const acceptDelivery = async (order) => {
    try {
      const res = await fetch(`http://localhost:5000/api/outlet/orders/${order.id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Delivery accepted! Stock replenished to 100%.');
        setConfirming(null);
        setOrders(orders.map(o => o.id === order.id ? { ...o, received_confirmed: true } : o));
        if (refreshStats) refreshStats();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to accept delivery');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  if (loading) return <p className="text-muted">Loading reorders...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>Reorder Request Tracker</h3>
        <button className="btn btn-outline" onClick={fetchOrders}>Refresh</button>
      </div>

      {/* Confirmation Popup */}
      {confirming && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '420px' }}>
            <h4 className="mb-3">Confirm Delivery</h4>
            <p className="mb-4">
              Confirm delivery of <strong>{confirming.items?.map(i => `${i.quantity} × ${i.product?.name}`).join(', ')}</strong> received?
            </p>
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
              Stock for these products will automatically be restored to <strong>100%</strong>.
            </p>
            <div className="flex gap-3">
              <button className="btn btn-primary" onClick={() => acceptDelivery(confirming)}>Confirm & Accept</button>
              <button className="btn btn-outline" onClick={() => setConfirming(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {orders.length === 0 ? (
          <p className="text-center text-muted py-4">No reorder requests found.</p>
        ) : (
          orders.map(order => {
            const status = STATUS_INFO[order.status] || { color: 'var(--text-muted)', label: order.status };
            return (
              <div key={order.id} className="card" style={{ borderLeft: `4px solid ${status.color}` }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {order.orderNumber}
                      <span className="badge" style={{ backgroundColor: status.color }}>{order.status}</span>
                    </h4>
                    <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                      Placed: {formatDateTime(order.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(order.totalAmount)}</div>
                  </div>
                </div>

                <div className="mb-3" style={{ backgroundColor: 'var(--bg-color)', padding: '12px', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}>
                  <strong>Products: </strong>
                  {order.items?.map(i => `${i.quantity} × ${i.product?.name}`).join(' | ')}
                </div>

                <div style={{ fontSize: '0.9rem' }}>
                  {order.status === 'Pending' && (
                    <span className="text-muted">Waiting for factory approval...</span>
                  )}
                  {order.status === 'Approved' && (
                    <span>Distributor: <strong>{order.Distributor?.name || 'To be assigned'}</strong></span>
                  )}
                  {(order.status === 'Dispatched' || order.status === 'In Transit') && (
                    <div className="flex items-center gap-3 mt-3">
                      <span>Distributor: <strong>{order.Distributor?.name || 'Assigned'}</strong></span>
                      <span style={{ color: 'var(--info)' }}>Live tracking available</span>
                      
                      {order.received_confirmed ? (
                        <button className="btn" disabled style={{ backgroundColor: 'var(--text-muted)', color: 'white', border: 'none', marginLeft: 'auto' }}>
                          Confirmed
                        </button>
                      ) : (
                        <button className="btn" style={{ backgroundColor: 'var(--success)', color: 'white', border: 'none', marginLeft: 'auto' }} onClick={() => setConfirming(order)}>
                          Received
                        </button>
                      )}
                    </div>
                  )}
                  {order.status === 'Completed' && (
                    <span style={{ color: 'var(--success)', fontWeight: 500 }}>✓ Delivery accepted and stock replenished</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OutletReorders;
