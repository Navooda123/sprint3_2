import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../utils/formatters';

const sriLankanBanks = [
  'Bank of Ceylon', "People's Bank", 'Commercial Bank',
  'Sampath Bank', 'Hatton National Bank (HNB)'
];

const RetailerReorderModal = ({ product, currentStock, onClose, token, refreshStats, onReorderSuccess }) => {
  const quantityToOrder = 100 - currentStock; // Calculate to reach 100
  const [paymentForm, setPaymentForm] = useState({
    quantity: quantityToOrder,
    bankName: '',
    accountNumber: '',
    accountHolder: ''
  });
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  if (!product) return null;

  const totalAmount = (parseFloat(product.price) || 0) * paymentForm.quantity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Retailer manual reorder goes to their assigned Distributor (not Admin)
      const res = await fetch('http://localhost:5000/api/inventory/manual-reorder', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: paymentForm.quantity,
          totalAmount,
          bankName: paymentForm.bankName,
          accountNumber: paymentForm.accountNumber,
          accountHolder: paymentForm.accountHolder
        })
      });
      
      if (res.ok) {
        const orderData = await res.json();
        setSuccessData({ ...orderData, bankName: paymentForm.bankName });
        toast.success(`Payment Confirmed! Order ${orderData.orderNumber} sent to your Distributor.`);
        refreshStats();
        if(onReorderSuccess) onReorderSuccess(paymentForm.quantity);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Payment failed');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = () => {
    // Generate a simple PDF-like blob text file as a mock receipt
    const receiptContent = `
    ======================================
    NESTLÉ LANKA CONNECT - PAYMENT RECEIPT
    ======================================
    Transaction ID: TXN-${Math.floor(Math.random() * 1000000)}
    Order ID: ${successData.orderNumber}
    Date: ${formatDateTime(successData.createdAt)}
    
    Item: ${product.name} (SKU: ${product.sku})
    Quantity: ${paymentForm.quantity}
    Unit Price: Rs. ${Number(product.price).toFixed(2)}
    
    TOTAL AMOUNT: Rs. ${totalAmount.toFixed(2)}
    
    Paid via: ${successData.bankName}
    Status: PAYMENT CONFIRMED
    ======================================
    `;
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${successData.orderNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: '500px', animation: 'fadeIn 0.2s ease-out' }}>
        
        {successData ? (
          <div className="text-center py-4">
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 20px' }}>✓</div>
            <h2>Payment Successful</h2>
            <p className="text-muted mb-4">Transaction Confirmed for {successData.orderNumber}</p>
            <button className="btn btn-primary btn-full mb-2" onClick={downloadReceipt}>Download Receipt</button>
            <button className="btn btn-outline btn-full" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3>Place Reorder & Pay</h3>
              <button className="icon-btn" onClick={onClose}>×</button>
            </div>

            <div className="mb-4" style={{ padding: '15px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
              <div className="flex justify-between mb-2">
                <strong>{product.name}</strong>
                <span className="text-muted">{product.sku}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted">Current Stock</span>
                <span style={{ color: currentStock <= 25 ? 'var(--danger)' : 'inherit' }}>{currentStock} units</span>
              </div>
              <div className="flex justify-between mt-3 pt-3" style={{ borderTop: '1px dashed var(--border-color)' }}>
                <span>Unit Price</span>
                <strong>Rs. {Number(product.price).toFixed(2)}</strong>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label flex justify-between">
                  <span>Order Quantity (to reach 100)</span>
                </label>
                <input type="number" className="form-control" required value={paymentForm.quantity} onChange={e => setPaymentForm({...paymentForm, quantity: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Select Payment Bank</label>
                <select className="form-control" required value={paymentForm.bankName} onChange={e => setPaymentForm({...paymentForm, bankName: e.target.value})}>
                  <option value="">-- Select Sri Lankan Bank --</option>
                  {sriLankanBanks.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input type="text" className="form-control" required value={paymentForm.accountNumber} onChange={e => setPaymentForm({...paymentForm, accountNumber: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Holder</label>
                  <input type="text" className="form-control" required value={paymentForm.accountHolder} onChange={e => setPaymentForm({...paymentForm, accountHolder: e.target.value})} />
                </div>
              </div>

              <div className="mt-4">
                <button type="submit" className="btn btn-primary btn-full flex justify-between items-center" disabled={loading} style={{ padding: '12px 20px', fontSize: '1.1rem' }}>
                  <span>Pay Now</span>
                  <strong>Rs. {totalAmount.toFixed(2)}</strong>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default RetailerReorderModal;
