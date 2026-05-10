import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

const OutletInvoiceTracker = () => {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
    if (socket) {
      socket.on('unblock:approved', fetchInvoices);
      socket.on('delivery:received', fetchInvoices);
    }
    return () => {
      if (socket) {
        socket.off('unblock:approved', fetchInvoices);
        socket.off('delivery:received', fetchInvoices);
      }
    };
  }, [socket, token]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/outlet/retailer-orders', { // we need to fetch invoices here
        headers: { Authorization: `Bearer ${token}` }
      });
      // Wait, there is no endpoint yet. Let's create one or just use /api/outlet/invoices
      const resInvoices = await fetch('http://localhost:5000/api/outlet/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resInvoices.ok) setInvoices(await resInvoices.json());
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

  const outstandingTotal = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((sum, i) => sum + parseFloat(i.full_amount), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  if (loading) return <div>Loading invoices...</div>;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="text-muted text-sm">Total Outstanding</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--warning)' }}>{formatCurrency(outstandingTotal)}</div>
        </div>
        <div className="card">
          <div className="text-muted text-sm">Overdue Invoices</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--danger)' }}>{overdueCount}</div>
        </div>
      </div>

      <div className="card table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Distributor</th>
              <th>Order #</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Days Remaining</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan="6" className="text-center text-muted">No invoices found.</td></tr>
            ) : (
              invoices.map(invoice => {
                const daysRemaining = getDaysRemaining(invoice.due_date);
                let timeColor = 'var(--success)';
                if (daysRemaining <= 3 && daysRemaining > 0) timeColor = 'var(--warning)';
                if (daysRemaining <= 0) timeColor = 'var(--danger)';

                return (
                  <tr key={invoice.id}>
                    <td>{invoice.Distributor?.name}</td>
                    <td>{invoice.Order?.orderNumber}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(invoice.full_amount)}</td>
                    <td>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      {invoice.status === 'pending' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '60px', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.max(0, Math.min(100, (daysRemaining / 7) * 100))}%`, height: '100%', backgroundColor: timeColor }}></div>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: timeColor }}>{daysRemaining}d</span>
                        </div>
                      ) : invoice.status === 'overdue' ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{-daysRemaining}d overdue</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: invoice.status === 'paid' || invoice.status === 'paid_discounted' ? 'var(--success)' : invoice.status === 'overdue' ? 'var(--danger)' : 'var(--warning)' }}>
                        {invoice.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
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

export default OutletInvoiceTracker;
