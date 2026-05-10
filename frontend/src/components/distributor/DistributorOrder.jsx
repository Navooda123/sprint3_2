import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

const DistributorOrder = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [accountStatus, setAccountStatus] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchAccountStatus();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/factory/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setProducts(await res.json());
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const fetchAccountStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/distributor/account-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAccountStatus(await res.json());
    } catch (error) {
      console.error('Failed to load account status');
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
      setCart(cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 10 } : i));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, price: product.price, quantity: 10 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(i => {
      if (i.productId === id) {
        const newQ = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQ };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const placeOrder = async (paymentOption) => {
    try {
      const res = await fetch('http://localhost:5000/api/distributor/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: cart, paymentOption })
      });
      if (res.ok) {
        toast.success('Order placed successfully!');
        setCart([]);
        setShowPaymentModal(false);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to place order');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  if (accountStatus?.account_status === 'blocked') {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--danger)', backgroundColor: 'rgba(211,47,47,0.05)' }}>
        <h3 style={{ color: 'var(--danger)' }}>Account Blocked</h3>
        <p>Your account is locked due to overdue invoices.</p>
        <div style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '15px', borderRadius: 'var(--radius)', marginTop: '15px' }}>
          <strong>Failure to pay within 3 days will result in legal proceedings by Nestlé Lanka.</strong>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4">Order Stock from Provincial Outlet</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4>Available Products</h4>
          <div className="grid gap-3">
            {products.map(p => (
              <div key={p.id} className="card flex justify-between items-center" style={{ padding: '15px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="text-muted" style={{ fontSize: '0.9rem' }}>{formatCurrency(p.price)}</div>
                </div>
                <button className="btn btn-outline" onClick={() => addToCart(p)}>Add to Order</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4>Current Order</h4>
          <div className="card">
            {cart.length === 0 ? (
              <p className="text-muted text-center py-4">Your order is empty.</p>
            ) : (
              <>
                <table className="w-full text-left mb-4" style={{ fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th className="pb-2">Item</th>
                      <th className="pb-2">Qty</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.productId} style={{ borderTop: '1px solid var(--border-color)' }}>
                        <td className="py-3">{item.name}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.productId, -10)} className="btn btn-outline" style={{ padding: '2px 8px' }}>-</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.productId, 10)} className="btn btn-outline" style={{ padding: '2px 8px' }}>+</button>
                          </div>
                        </td>
                        <td className="text-right" style={{ fontWeight: 600 }}>{formatCurrency(item.quantity * item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between items-center pt-3" style={{ borderTop: '2px solid var(--border-color)' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Total:</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(totalAmount)}</div>
                </div>
                <button className="btn btn-primary w-full mt-4" onClick={() => setShowPaymentModal(true)}>Proceed to Checkout</button>
              </>
            )}
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '650px', maxWidth: '95vw', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ margin: 0 }}>Checkout & Payment Selection</h3>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Option A — Pay Now (10% Discount) */}
              <div 
                className="card" 
                style={{ 
                  border: '2px solid var(--secondary)', 
                  cursor: 'pointer', 
                  transition: 'transform 0.2s',
                  backgroundColor: 'rgba(0, 90, 156, 0.02)',
                  position: 'relative',
                  overflow: 'hidden'
                }} 
                onClick={() => placeOrder('immediate')}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'var(--secondary)', color: 'white', padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, borderBottomLeftRadius: '8px' }}>
                  BEST VALUE
                </div>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--secondary)' }}>Option A: Pay Now</h4>
                <div className="badge badge-info mb-3" style={{ backgroundColor: 'rgba(0, 90, 156, 0.1)', color: 'var(--secondary)' }}>10% Instant Discount</div>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '20px', lineHeight: '1.4' }}>Pay immediately and save 10% on the entire order value.</p>
                
                <div className="mt-auto">
                  <div style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatCurrency(totalAmount)}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    {formatCurrency(totalAmount * 0.9)}
                  </div>
                </div>
              </div>

              {/* Option B — Pay Within 7 Days (No Discount) */}
              <div 
                className="card" 
                style={{ 
                  border: '1px solid var(--border-color)', 
                  cursor: 'pointer', 
                  transition: 'transform 0.2s'
                }} 
                onClick={() => placeOrder('credit')}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <h4 style={{ margin: '0 0 10px 0' }}>Option B: Pay in 7 Days</h4>
                <div className="badge mb-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', color: 'var(--text-muted)' }}>Standard Terms</div>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '20px', lineHeight: '1.4' }}>Pay within 7 days. Standard order value applies. No discount.</p>
                
                <div className="mt-auto">
                  <div style={{ height: '1.4rem' }}></div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                    {formatCurrency(totalAmount)}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Due by {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '24px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                ⚠️ Partial payments are not accepted.
              </p>
            </div>
            
            <div className="text-center mt-6">
              <button className="btn btn-outline" style={{ width: '120px' }} onClick={() => setShowPaymentModal(false)}>Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistributorOrder;
