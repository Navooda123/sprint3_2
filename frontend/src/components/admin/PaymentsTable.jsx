import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const PaymentsTable = () => {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/factory/payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPayments(await res.json());
      }
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const incomingPayments = payments.filter(p => p.type === 'Incoming');
  const outgoingPayments = payments.filter(p => p.type === 'Outgoing');

  const handlePay = async (paymentId) => {
    toast.success('Simulation: Payment Processed Successfully!');
    // In a real app, this would open the Bank Simulation Modal and then call an API to update status to Paid.
  };

  const renderTable = (data, isOutgoing) => (
    <table className="w-full text-left mt-3" style={{ fontSize: '0.9rem' }}>
      <thead>
        <tr style={{ color: 'var(--text-muted)' }}>
          <th className="pb-2">Date</th>
          <th className="pb-2">{isOutgoing ? 'Farmer' : 'Outlet'}</th>
          <th className="pb-2">District</th>
          <th className="pb-2">Amount (Rs.)</th>
          <th className="pb-2">Status</th>
          <th className="pb-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan="6" className="text-center text-muted py-4">No payments found.</td></tr>
        ) : (
          data.map(p => {
            const user = isOutgoing ? p.Bid?.farmer : p.Order?.Recipient;
            return (
              <tr key={p.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                <td className="py-3">{formatDateTime(p.createdAt)}</td>
                <td style={{ fontWeight: 500 }}>{user?.name || 'Unknown'}</td>
                <td>{user?.district || 'Unknown'}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                <td>
                  <span className="badge" style={{ backgroundColor: p.status === 'Paid' ? 'var(--success)' : p.status === 'Overdue' ? 'var(--danger)' : 'var(--warning)' }}>
                    {p.status}
                  </span>
                </td>
                <td className="text-right">
                  {isOutgoing && p.status === 'Pending' ? (
                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handlePay(p.id)}>Pay Now</button>
                  ) : (
                    <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>View Receipt</button>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="card">
        <h3 style={{ color: 'var(--success)' }}>Incoming Payments (From Outlets)</h3>
        {loading ? <p className="text-muted">Loading...</p> : renderTable(incomingPayments, false)}
      </div>

      <div className="card">
        <h3 style={{ color: 'var(--warning)' }}>Outgoing Payments (To Farmers)</h3>
        {loading ? <p className="text-muted">Loading...</p> : renderTable(outgoingPayments, true)}
      </div>
    </div>
  );
};

export default PaymentsTable;
