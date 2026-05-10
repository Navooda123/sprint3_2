import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const FarmerPayments = () => {
  const { token, user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/farmer/payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setPayments(await res.json());
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const awaitingPayments = payments.filter(p => p.status === 'Pending' || p.status === 'Overdue');
  const receivedPayments = payments.filter(p => p.status === 'Paid');

  // Mask account number for security view
  const maskedAccount = user?.bankAccount ? `****${user.bankAccount.slice(-4)}` : 'No Account Linked';

  const renderTable = (data) => (
    <table className="w-full text-left" style={{ fontSize: '0.9rem' }}>
      <thead>
        <tr style={{ color: 'var(--text-muted)' }}>
          <th className="pb-2">Date</th>
          <th className="pb-2">Material</th>
          <th className="pb-2">Quantity</th>
          <th className="pb-2">Amount (Rs.)</th>
          <th className="pb-2">Bank Details</th>
          <th className="pb-2">Status</th>
          <th className="pb-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan="7" className="text-center text-muted py-4">No records found.</td></tr>
        ) : (
          data.map(p => (
            <tr key={p.id} style={{ borderTop: '1px solid var(--border-color)' }}>
              <td className="py-3">{formatDateTime(p.createdAt)}</td>
              <td>{p.Bid?.productType || p.Bid?.request?.materialName}</td>
              <td>{p.Bid?.quantity}</td>
              <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
              <td>
                <div style={{ fontSize: '0.85rem' }}>{user?.bankName}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{maskedAccount}</div>
              </td>
              <td>
                <span className="badge" style={{ backgroundColor: p.status === 'Paid' ? 'var(--success)' : p.status === 'Overdue' ? 'var(--danger)' : 'var(--warning)' }}>
                  {p.status}
                </span>
              </td>
              <td className="text-right">
                {p.status === 'Paid' ? (
                  <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Download Receipt</button>
                ) : (
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>Processing</span>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>Payment Center</h3>
        <button className="btn btn-outline">Export PDF History</button>
      </div>

      <div className="card mb-4" style={{ backgroundColor: 'rgba(237,108,2,0.05)', borderLeft: '4px solid var(--warning)' }}>
        <h4 className="mb-3" style={{ color: 'var(--warning)' }}>Awaiting Payments</h4>
        {loading ? <p>Loading...</p> : renderTable(awaitingPayments)}
      </div>

      <div className="card">
        <h4 className="mb-3" style={{ color: 'var(--success)' }}>Payment History</h4>
        {loading ? <p>Loading...</p> : renderTable(receivedPayments)}
      </div>
    </div>
  );
};

export default FarmerPayments;
