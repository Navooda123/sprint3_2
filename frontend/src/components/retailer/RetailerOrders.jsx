import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../utils/formatters';
import { CheckCircle, Clock, Truck, Package, CheckSquare } from 'lucide-react';

const RetailerOrders = ({ refreshStats }) => {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    if (socket) {
      // Real-time: When distributor marks delivery dispatched
      socket.on('order:dispatched', (data) => {
        toast.success(`Your order is on the way!`, { icon: '🚚' });
        fetchOrders();
      });
      socket.on('retailer:auto_reorder', () => {
        fetchOrders();
      });
    }

    return () => {
      if (socket) {
        socket.off('order:dispatched');
        socket.off('retailer:auto_reorder');
      }
    };
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDelivery = async (order) => {
    try {
      const res = await fetch(`http://localhost:5000/api/inventory/orders/${order.id}/complete`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'Completed', received_confirmed_at: new Date() } : o));
        toast.success('Delivery accepted! Stock updated.');
        if (refreshStats) refreshStats();
      } else {
        toast.error('Error accepting delivery');
      }
    } catch (error) {
      toast.error('Error accepting delivery');
    }
  };

  const getStepStatus = (orderStatus, step) => {
    const statuses = ['Pending', 'Approved', 'Dispatched', 'In Transit', 'Delivered', 'Completed'];
    const currentIdx = statuses.indexOf(orderStatus);
    if (currentIdx >= step) return 'completed';
    if (currentIdx === step - 1) return 'active';
    return 'pending';
  };

  const isAutoReorder = (order) => order.orderNumber?.startsWith('RETAILER-AUTO') || order.orderNumber?.startsWith('AUTO-');

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3>Reorder Delivery Tracker</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Track deliveries from your assigned Distributor</p>
        </div>
        <button className="btn btn-outline" onClick={fetchOrders}>Refresh Timeline</button>
      </div>

      {loading ? <p>Loading tracker...</p> : orders.length === 0 ? (
        <div className="card text-center py-6">
          <Package size={48} className="text-muted mx-auto mb-3" />
          <p className="text-muted">No active reorders found.</p>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Use the Stock Management tab to place a reorder or adjust stock below 25% to trigger auto-reorder.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map(order => (
            <div key={order.id} className="card">
              <div className="flex justify-between items-start mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    Order {order.orderNumber}
                    {isAutoReorder(order) && (
                      <span className="badge" style={{ backgroundColor: 'rgba(237,108,2,0.15)', color: 'var(--warning)', border: '1px solid var(--warning)', fontSize: '0.7rem' }}>
                        🔄 Auto-Reorder
                      </span>
                    )}
                  </h4>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>Placed: {formatDateTime(order.createdAt)}</div>
                  {order.Distributor && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '4px' }}>
                      Distributor: <strong>{order.Distributor.name}</strong>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div style={{ fontWeight: 600 }}>Rs. {Number(order.totalAmount).toFixed(2)}</div>
                  <span className="badge badge-success" style={{ backgroundColor: order.status === 'Completed' ? 'var(--success)' : order.status === 'In Transit' || order.status === 'Dispatched' ? 'var(--primary)' : 'var(--warning)' }}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '20px 0' }}>
                <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '2px', backgroundColor: 'var(--border-color)', zIndex: 0 }}></div>
                
                {[
                  { label: 'Order Placed', icon: Package },
                  { label: 'Approved', icon: CheckCircle },
                  { label: 'Dispatched', icon: Truck },
                  { label: 'In Transit', icon: Truck },
                  { label: 'Delivered', icon: CheckSquare }
                ].map((step, idx) => {
                  const status = getStepStatus(order.status, idx);
                  const Icon = step.icon;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: '20%' }}>
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', 
                        backgroundColor: status === 'completed' ? 'var(--success)' : status === 'active' ? 'white' : 'var(--bg-color)', 
                        border: `2px solid ${status !== 'pending' ? 'var(--success)' : 'var(--border-color)'}`, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        color: status === 'completed' ? 'white' : status === 'active' ? 'var(--success)' : 'var(--text-muted)' 
                      }}>
                        <Icon size={16} />
                      </div>
                      <div style={{ fontSize: '0.72rem', marginTop: '8px', textAlign: 'center', fontWeight: status !== 'pending' ? 600 : 400, color: status !== 'pending' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Received Button — only when In Transit or Dispatched */}
              {(order.status === 'In Transit' || order.status === 'Dispatched') && (
                <div className="mt-4 pt-3 text-center" style={{ borderTop: '1px solid var(--border-color)' }}>
                  {order.received_confirmed_at ? (
                    <button className="btn flex items-center justify-center gap-2 mx-auto" disabled style={{ backgroundColor: 'var(--text-muted)', color: 'white', border: 'none' }}>
                      <CheckSquare size={18} /> Confirmed
                    </button>
                  ) : (
                    <button 
                      className="btn flex items-center justify-center gap-2 mx-auto" 
                      style={{ backgroundColor: 'var(--success)', color: 'white', border: 'none', padding: '10px 24px', fontWeight: 600 }} 
                      onClick={() => handleAcceptDelivery(order)}
                    >
                      <CheckSquare size={18} /> Received — Confirm Delivery
                    </button>
                  )}
                </div>
              )}

              {order.status === 'Completed' && (
                <div className="mt-3 pt-3 text-center" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                    ✓ Delivery Confirmed & Stock Updated
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RetailerOrders;
