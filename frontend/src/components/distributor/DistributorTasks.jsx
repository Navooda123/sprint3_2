import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { MapPin, Clock, Truck, CheckCircle, XCircle, ShoppingCart } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const DistributorTasks = ({ deliveries, refreshDeliveries, token, isBlocked }) => {
  const { socket } = useSocket();
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (socket) {
      socket.on('retailer:auto_reorder', (data) => {
        toast(`New auto-reorder from Retailer! ${data.message || ''}`, { icon: '🛒', duration: 5000 });
        if (refreshDeliveries) refreshDeliveries();
      });

      // When a retailer confirms delivery received
      socket.on('delivery:received', (data) => {
        toast.success(`Order ${data.orderId} confirmed received by retailer!`);
        if (refreshDeliveries) refreshDeliveries();
      });
    }

    return () => {
      if (socket) {
        socket.off('retailer:auto_reorder');
        socket.off('delivery:received');
      }
    };
  }, [socket]);

  const handleAccept = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/distributor/deliveries/${id}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Delivery accepted');
        refreshDeliveries();
      } else {
        toast.error('Failed to accept');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/distributor/deliveries/${rejectingId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (res.ok) {
        toast.success('Delivery rejected');
        setRejectingId(null);
        setRejectReason('');
        refreshDeliveries();
      } else {
        toast.error('Failed to reject');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleTransit = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/distributor/deliveries/${id}/transit`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Out for delivery - recipient notified');
        refreshDeliveries();
      } else {
        toast.error('Failed to update status');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleDeliver = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/distributor/deliveries/${id}/deliver`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Delivery completed');
        refreshDeliveries();
      } else {
        toast.error('Failed to complete delivery');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const renderTaskCard = (task) => {
    const borderColor = task.status === 'Pending' ? 'var(--text-muted)' :
      task.status === 'Approved' ? 'var(--warning)' :
      task.status === 'Accepted' ? 'var(--info)' :
      task.status === 'In Transit' ? 'var(--primary)' : 'var(--success)';

    const isRetailerOrder = task.orderNumber?.startsWith('RETAILER-AUTO') || task.orderNumber?.startsWith('MAN-');

    return (
    <div key={task.id} className="card" style={{ padding: '12px', marginBottom: '10px', borderLeft: `4px solid ${borderColor}` }}>
      <div className="flex justify-between items-start mb-2">
        <h4 style={{ margin: 0, fontSize: '1rem' }}>
          {task.orderNumber}
          {isRetailerOrder && <span className="badge" style={{ marginLeft: '6px', fontSize: '0.65rem', backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>Retailer</span>}
        </h4>
        <span className="badge" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
          {task.Recipient?.role || 'Recipient'}
        </span>
      </div>
      
      <div className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
        <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
        {task.Recipient?.name} ({task.Recipient?.district || 'Unknown District'})
      </div>

      <div style={{ backgroundColor: 'var(--bg-color)', padding: '8px', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '10px' }}>
        {task.items?.map(i => `${i.quantity}x ${i.product?.name}`).join(', ')}
        <div style={{ fontWeight: 600, marginTop: '4px' }}>Value: {formatCurrency(task.totalAmount)}</div>
      </div>

      <div className="flex gap-2 mt-auto">
        {/* Pending: Retailer reorders waiting for Distributor to approve */}
        {task.status === 'Pending' && (
          <button className="btn btn-primary w-full" style={{ padding: '6px', fontSize: '0.85rem', backgroundColor: 'var(--info)' }} onClick={() => handleAccept(task.id)} disabled={isBlocked}>
            Approve &amp; Prepare {isBlocked && ' (Locked)'}
          </button>
        )}
        {task.status === 'Approved' && (
          <>
            <button className="btn btn-primary flex-1" style={{ padding: '4px', fontSize: '0.8rem', backgroundColor: 'var(--success)' }} onClick={() => handleAccept(task.id)} disabled={isBlocked}>Accept</button>
            <button className="btn btn-outline flex-1" style={{ padding: '4px', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setRejectingId(task.id)} disabled={isBlocked}>Reject</button>
          </>
        )}
        {task.status === 'Accepted' && (
          <button className="btn btn-primary w-full" style={{ padding: '6px', fontSize: '0.85rem' }} onClick={() => handleTransit(task.id)} disabled={isBlocked}>Out for Delivery</button>
        )}
        {task.status === 'In Transit' && (
          <button className="btn btn-primary w-full" style={{ padding: '6px', fontSize: '0.85rem', backgroundColor: 'var(--success)' }} onClick={() => handleDeliver(task.id)} disabled={isBlocked}>Mark Delivered</button>
        )}
        {task.status === 'Delivered' && (
          <span className="text-muted w-full text-center" style={{ fontSize: '0.85rem', display: 'block', padding: '6px' }}>
            <CheckCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
            Completed
          </span>
        )}
      </div>
    </div>
  );};


  return (
    <div>
      {/* Reject Modal */}
      {rejectingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px' }}>
            <h4 className="mb-3">Reject Delivery Assignment</h4>
            <form onSubmit={handleReject}>
              <div className="form-group">
                <label className="form-label">Reason for Rejection</label>
                <textarea className="form-control" rows="3" value={rejectReason} onChange={e => setRejectReason(e.target.value)} required placeholder="Vehicle breakdown, overloaded, out of coverage..."></textarea>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--danger)' }}>Confirm Reject</button>
                <button type="button" className="btn btn-outline" onClick={() => setRejectingId(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'start', overflowX: 'auto' }}>
        {/* Column 1: Pending (Retailer reorders awaiting Distributor) */}
        <div className="kanban-column" style={{ backgroundColor: 'var(--bg-color)', padding: '10px', borderRadius: 'var(--radius)', minHeight: '500px' }}>
          <h4 className="mb-3 flex justify-between items-center" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <span>New Reorders</span>
            <span className="badge" style={{ backgroundColor: 'var(--text-muted)' }}>{deliveries.filter(d => d.status === 'Pending').length}</span>
          </h4>
          {deliveries.filter(d => d.status === 'Pending').map(renderTaskCard)}
        </div>

        {/* Column 2: Approved (Factory-assigned) */}
        <div className="kanban-column" style={{ backgroundColor: 'var(--bg-color)', padding: '10px', borderRadius: 'var(--radius)', minHeight: '500px' }}>
          <h4 className="mb-3 flex justify-between items-center" style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>
            <span>Approved</span>
            <span className="badge" style={{ backgroundColor: 'var(--warning)' }}>{deliveries.filter(d => d.status === 'Approved').length}</span>
          </h4>
          {deliveries.filter(d => d.status === 'Approved').map(renderTaskCard)}
        </div>

        <div className="kanban-column" style={{ backgroundColor: 'var(--bg-color)', padding: '10px', borderRadius: 'var(--radius)', minHeight: '500px' }}>
          <h4 className="mb-3 flex justify-between items-center" style={{ color: 'var(--info)' }}>
            <span>Accepted</span>
            <span className="badge" style={{ backgroundColor: 'var(--info)' }}>{deliveries.filter(d => d.status === 'Accepted').length}</span>
          </h4>
          {deliveries.filter(d => d.status === 'Accepted').map(renderTaskCard)}
        </div>

        <div className="kanban-column" style={{ backgroundColor: 'var(--bg-color)', padding: '10px', borderRadius: 'var(--radius)', minHeight: '500px' }}>
          <h4 className="mb-3 flex justify-between items-center" style={{ color: 'var(--primary)' }}>
            <span>In Transit</span>
            <span className="badge" style={{ backgroundColor: 'var(--primary)' }}>{deliveries.filter(d => d.status === 'In Transit').length}</span>
          </h4>
          {deliveries.filter(d => d.status === 'In Transit').map(renderTaskCard)}
        </div>

        <div className="kanban-column" style={{ backgroundColor: 'var(--bg-color)', padding: '10px', borderRadius: 'var(--radius)', minHeight: '500px' }}>
          <h4 className="mb-3 flex justify-between items-center" style={{ color: 'var(--success)' }}>
            <span>Delivered</span>
            <span className="badge" style={{ backgroundColor: 'var(--success)' }}>{deliveries.filter(d => d.status === 'Delivered').length}</span>
          </h4>
          {deliveries.filter(d => d.status === 'Delivered').map(renderTaskCard)}
        </div>
      </div>
    </div>
  );
};

export default DistributorTasks;
