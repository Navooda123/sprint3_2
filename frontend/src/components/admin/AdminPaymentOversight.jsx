import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

const AdminPaymentOversight = () => {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterOutlet, setFilterOutlet] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchInvoices();
    if (socket) {
      socket.on('unblock:approved', fetchInvoices);
      socket.on('delivery:received', fetchInvoices);
      socket.on('invoice:overdue', fetchInvoices);
    }
    return () => {
      if (socket) {
        socket.off('unblock:approved', fetchInvoices);
        socket.off('delivery:received', fetchInvoices);
        socket.off('invoice:overdue', fetchInvoices);
      }
    };
  }, [socket, token]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/factory/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setInvoices(await res.json());
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return 0;
    const diffTime = new Date(dueDate) - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filterOutlet && inv.Outlet?.name !== filterOutlet) return false;
    if (filterStatus && inv.status !== filterStatus) return false;
    return true;
  });

  const uniqueOutlets = [...new Set(invoices.map(i => i.Outlet?.name).filter(Boolean))];

  if (loading) return <div>Loading oversight data...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>Distributor Payment Oversight (All Provinces)</h3>
        <button className="btn btn-outline" onClick={fetchInvoices}>Refresh Data</button>
      </div>

      <div className="flex gap-4 mb-4">
        <select className="form-control" style={{ width: '200px' }} value={filterOutlet} onChange={e => setFilterOutlet(e.target.value)}>
          <option value="">All Outlets</option>
          {uniqueOutlets.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="form-control" style={{ width: '200px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="paid_discounted">Paid (Discounted)</option>
          <option value="overdue">Overdue</option>
          <option value="paid_pending_verification">Paid (Awaiting Verification)</option>
        </select>
      </div>

      <div className="card table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Outlet</th>
              <th>Distributor</th>
              <th>Order #</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr><td colSpan="7" className="text-center text-muted">No invoices found matching criteria.</td></tr>
            ) : (
              filteredInvoices.map(invoice => {
                const daysRemaining = getDaysRemaining(invoice.due_date);
                return (
                  <tr key={invoice.id} style={{ backgroundColor: invoice.status === 'overdue' ? 'rgba(211,47,47,0.05)' : 'transparent' }}>
                    <td>{invoice.Outlet?.name}</td>
                    <td>{invoice.Distributor?.name} ({invoice.Distributor?.province})</td>
                    <td>{invoice.Order?.orderNumber}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(invoice.full_amount)}</td>
                    <td>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: invoice.status === 'paid' || invoice.status === 'paid_discounted' ? 'var(--success)' : invoice.status === 'overdue' ? 'var(--danger)' : invoice.status === 'paid_pending_verification' ? 'var(--info)' : 'var(--warning)' }}>
                        {invoice.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {invoice.status === 'overdue' && (
                        <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>{-daysRemaining} days overdue</span>
                      )}
                      {invoice.status === 'pending' && daysRemaining > 0 && (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Due in {daysRemaining} days</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPaymentOversight;
