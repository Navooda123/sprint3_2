import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const AdminUnblockRequests = () => {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    if (socket) {
      socket.on('unblock:requested', fetchRequests);
    }
    return () => {
      if (socket) {
        socket.off('unblock:requested', fetchRequests);
      }
    };
  }, [socket, token]);

  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/factory/unblock-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setRequests(await res.json());
    } catch (error) {
      toast.error('Failed to load unblock requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/factory/unblock-requests/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`Request ${action}ed successfully.`);
        fetchRequests();
      } else {
        toast.error(`Failed to ${action} request`);
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  if (loading) return <div>Loading unblock requests...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>Distributor Account Unblock Requests</h3>
        <button className="btn btn-outline" onClick={fetchRequests}>Refresh</button>
      </div>

      <div className="card table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Request Date</th>
              <th>Distributor</th>
              <th>Province</th>
              <th>Associated Invoice</th>
              <th>Amount Paid</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan="7" className="text-center text-muted py-4">No pending unblock requests.</td></tr>
            ) : (
              requests.map(req => (
                <tr key={req.id}>
                  <td>{formatDateTime(req.createdAt)}</td>
                  <td style={{ fontWeight: 600 }}>{req.Distributor?.name}</td>
                  <td>{req.Distributor?.province}</td>
                  <td>#{req.Invoice?.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(req.Invoice?.full_amount)}</td>
                  <td>{req.notes || '-'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleAction(req.id, 'approve')}>
                        Verify & Unblock
                      </button>
                      <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleAction(req.id, 'reject')}>
                        Reject
                      </button>
                    </div>
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

export default AdminUnblockRequests;
