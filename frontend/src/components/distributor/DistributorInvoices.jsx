import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const DistributorInvoices = () => {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/distributor/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setInvoices(await res.json());
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (invoiceId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/distributor/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Payment submitted. Awaiting Admin verification.');
        fetchInvoices();
      } else {
        toast.error('Payment failed');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return 0;
    const diffTime = new Date(dueDate) - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3 className="mb-4">Outstanding Invoices</h3>
      <div className="grid grid-cols-1 gap-4">
        {invoices.length === 0 ? (
          <p className="text-muted text-center py-4">No invoices found.</p>
        ) : (
          invoices.map(invoice => {
            const daysRemaining = getDaysRemaining(invoice.due_date);
            let timeColor = 'var(--success)';
            if (daysRemaining <= 3 && daysRemaining > 0) timeColor = 'var(--warning)';
            if (daysRemaining <= 0) timeColor = 'var(--danger)';

            return (
              <div key={invoice.id} className="card" style={{ borderLeft: `4px solid ${invoice.status === 'overdue' ? 'var(--danger)' : 'var(--primary)'}` }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 style={{ margin: 0 }}>Invoice #{invoice.id} (Order {invoice.Order?.orderNumber})</h4>
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>Supplier: {invoice.Outlet?.name}</div>
                  </div>
                  <div className="text-right">
                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(invoice.full_amount)}</div>
                    <div className="badge mt-1" style={{ backgroundColor: invoice.status === 'paid' || invoice.status === 'paid_discounted' ? 'var(--success)' : invoice.status === 'overdue' ? 'var(--danger)' : 'var(--warning)' }}>
                      {invoice.status.replace(/_/g, ' ').toUpperCase()}
                    </div>
                  </div>
                </div>

                {invoice.status === 'pending' && invoice.due_date && (
                  <div className="mt-3 p-3" style={{ backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                      <span style={{ fontSize: '0.9rem', color: timeColor, fontWeight: 600 }}>
                        {daysRemaining > 0 ? `${daysRemaining} days remaining` : `${Math.abs(daysRemaining)} days overdue`}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(0, Math.min(100, (daysRemaining / 7) * 100))}%`, height: '100%', backgroundColor: timeColor, transition: 'width 0.3s' }}></div>
                    </div>

                    <button className="btn btn-primary w-full mt-3" onClick={() => handlePayNow(invoice.id)}>
                      Pay Now {formatCurrency(invoice.full_amount)}
                    </button>
                  </div>
                )}
                
                {invoice.status === 'overdue' && (
                  <div className="mt-3 p-3" style={{ backgroundColor: 'rgba(211,47,47,0.1)', borderRadius: 'var(--radius)', border: '1px solid var(--danger)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Overdue by {Math.abs(daysRemaining)} days</span>
                    </div>
                    <button className="btn w-full mt-2" style={{ backgroundColor: 'var(--danger)', color: 'white' }} onClick={() => handlePayNow(invoice.id)}>
                      Settle Overdue Invoice
                    </button>
                  </div>
                )}

                {invoice.status === 'paid_pending_verification' && (
                  <div className="mt-3 p-3 text-center" style={{ backgroundColor: 'rgba(0,90,156,0.1)', borderRadius: 'var(--radius)', color: 'var(--primary)' }}>
                    Payment submitted. Your account remains locked until Admin verifies your payment.
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DistributorInvoices;
