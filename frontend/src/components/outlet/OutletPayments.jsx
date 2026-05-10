import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const OutletPayments = () => {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/outlet/payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setPayments(await res.json());
    } catch (error) {
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (order) => {
    // Simulate PDF download
    toast.success('Invoice download starting...');
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3>Payment History</h3>
        <button className="btn btn-outline" onClick={fetchPayments}>Refresh</button>
      </div>

      <table className="w-full text-left" style={{ fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ color: 'var(--text-muted)' }}>
            <th className="pb-2">Date</th>
            <th className="pb-2">Order ID</th>
            <th className="pb-2">Products</th>
            <th className="pb-2">Amount (Rs.)</th>
            <th className="pb-2">Status</th>
            <th className="pb-2 text-right">Invoice</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="6" className="text-center py-4 text-muted">Loading...</td></tr>
          ) : payments.length === 0 ? (
            <tr><td colSpan="6" className="text-center py-4 text-muted">No payment records yet.</td></tr>
          ) : (
            payments.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                <td className="py-3">{formatDateTime(p.createdAt)}</td>
                <td style={{ fontWeight: 500 }}>{p.Order?.orderNumber}</td>
                <td>{p.Order?.items?.map(i => i.product?.name).join(', ') || '—'}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                <td>
                  <span className="badge" style={{ backgroundColor: p.status === 'Paid' ? 'var(--success)' : p.status === 'Overdue' ? 'var(--danger)' : 'var(--warning)' }}>
                    {p.status}
                  </span>
                </td>
                <td className="text-right">
                  <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => downloadInvoice(p.Order)}>
                    Download PDF
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OutletPayments;
