import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { DollarSign, User, Calendar, CreditCard } from 'lucide-react';

const RetailerPaymentsList = () => {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/distributor/retailer-payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setPayments(await res.json());
    } catch (error) {
      toast.error('Failed to load retailer payments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading payments...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>Incoming Retailer Payments</h3>
        <button className="btn btn-outline" onClick={fetchPayments}>Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {payments.length === 0 ? (
          <div className="card col-span-2 text-center py-8 text-muted">
            <DollarSign size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <p>No payments recorded from retailers yet.</p>
          </div>
        ) : (
          payments.map(payment => (
            <div key={payment.id} className="card border-l-4" style={{ borderLeftColor: 'var(--success)' }}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div style={{ backgroundColor: 'rgba(46,125,50,0.1)', padding: '10px', borderRadius: '50%', color: 'var(--success)' }}>
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{formatCurrency(payment.amount)}</div>
                    <div className="text-muted text-sm">{payment.status}</div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted">
                  <Calendar size={12} className="inline mr-1" />
                  {formatDateTime(payment.createdAt)}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-color)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}>
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} className="text-muted" />
                  <span className="font-semibold">{payment.Order?.Recipient?.name}</span>
                  <span className="text-muted">({payment.Order?.Recipient?.district})</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-muted" />
                  <span>Order: <span className="font-mono">{payment.Order?.orderNumber}</span></span>
                </div>
              </div>

              <div className="mt-3 flex justify-between items-center">
                <span className="badge" style={{ backgroundColor: 'var(--success)', fontSize: '0.75rem' }}>Verified Payment</span>
                <span className="text-xs text-muted">Transaction ID: TXN-{payment.id + 1000}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RetailerPaymentsList;
