import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Truck, CheckCircle, RefreshCw } from 'lucide-react';

const ActiveOrdersList = () => {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    if (socket) {
      // Listen for new auto-reorders
      socket.on('outlet:auto_reorder', () => {
        fetchOrders();
        toast('New auto-reorder received from an Outlet!', { icon: '📦' });
      });
      socket.on('delivery:received', () => {
        fetchOrders(); // Refresh when someone marks received
      });
    }

    return () => {
      if (socket) {
        socket.off('outlet:auto_reorder');
        socket.off('delivery:received');
      }
    };
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/factory/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (orderId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/factory/orders/${orderId}/dispatch`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Order dispatched! Recipient has been notified.');
        fetchOrders();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to dispatch');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return 'var(--warning)';
      case 'Approved': return 'var(--info)';
      case 'Dispatched': return 'var(--primary)';
      case 'In Transit': return 'var(--primary)';
      case 'Delivered': return 'var(--success)';
      case 'Completed': return 'var(--success)';
      default: return 'var(--text-muted)';
    }
  };

  const isAutoReorder = (order) => order.orderNumber?.startsWith('OUTLET-AUTO') || order.orderNumber?.startsWith('REORD-');

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3>Active Orders Pipeline</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Factory → Outlet supply orders and auto-reorders</p>
        </div>
        <button className="btn btn-outline flex items-center gap-2" onClick={fetchOrders}>
          <RefreshCw size={16} /> Refresh Pipeline
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <p className="text-center text-muted">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-muted">No active orders found.</p>
        ) : (
          orders.map(order => (
            <div key={order.id} className="card" style={{ borderLeft: `4px solid ${getStatusColor(order.status)}` }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {order.orderNumber}
                    <span className="badge" style={{ backgroundColor: getStatusColor(order.status) }}>{order.status}</span>
                    {isAutoReorder(order) && (
                      <span className="badge" style={{ backgroundColor: 'rgba(237,108,2,0.15)', color: 'var(--warning)', border: '1px solid var(--warning)', fontSize: '0.7rem' }}>
                        🔄 Auto-reorder — {order.Recipient?.name}
                      </span>
                    )}
                  </h4>
                  <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Placed: {formatDateTime(order.createdAt)}
                  </div>
                  {order.items?.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {order.items.map(i => `${i.quantity}x ${i.product?.name}`).join(' | ')}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(order.totalAmount)}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>Payment: {order.paymentStatus}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4" style={{ backgroundColor: 'var(--bg-color)', padding: '15px', borderRadius: 'var(--radius)' }}>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Destination</div>
                  <div style={{ fontWeight: 600 }}>{order.Recipient?.name}</div>
                  <div style={{ fontSize: '0.9rem' }}>{order.Recipient?.district} {order.Recipient?.province ? `(${order.Recipient.province})` : ''}</div>
                  {order.Recipient?.role && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{order.Recipient.role}</div>
                  )}
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Logistics</div>
                  {order.Distributor ? (
                    <>
                      <div style={{ fontWeight: 600 }}>{order.Distributor?.name}</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>View Live Tracking &rarr;</div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--warning)' }}>Awaiting Assignment</div>
                  )}
                </div>
              </div>

              {/* Dispatch Button for Pending orders */}
              {order.status === 'Pending' && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    className="btn flex items-center gap-2"
                    style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px' }}
                    onClick={() => handleDispatch(order.id)}
                  >
                    <Truck size={16} /> Approve & Dispatch
                  </button>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                    Clicking dispatch will notify the recipient and start GPS tracking.
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActiveOrdersList;
