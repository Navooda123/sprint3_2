import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import DashboardGreeting from '../../components/shared/DashboardGreeting';
import ActivityLog from '../../components/shared/ActivityLog';
import { ShoppingCart, Package, CreditCard, TrendingUp, DollarSign, AlertTriangle, Truck, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DEMAND_BADGE = { High: 'bg-red-100 text-red-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-gray-100 text-gray-600' };

const RetailerDashboard = () => {
  const [stats, setStats] = useState({});
  const [trending, setTrending] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [cart, setCart] = useState([]);
  const [paymentType, setPaymentType] = useState('credit');
  const [isBlocked, setIsBlocked] = useState(false);
  const { user } = useAuth();
  const socket = useSocket();

  useEffect(() => {
    fetchAll();
    if (socket) {
      socket.on('order:dispatched', () => { toast.success('Your order is on its way!'); fetchAll(); });
      socket.on('journey:breakdown', (d) => toast.error(`⚠️ Delivery delay: ${d.message || 'Vehicle breakdown on your route.'}`));
      socket.on('unblock:approved', () => { toast.success('Account unblocked!'); fetchAll(); });
      socket.on('invoice:due_soon', (d) => toast('⏰ Invoice due soon: ' + d.invoiceId, { icon: '⏰' }));
    }
    return () => {
      if (socket) { socket.off('order:dispatched'); socket.off('journey:breakdown'); socket.off('unblock:approved'); socket.off('invoice:due_soon'); }
    };
  }, [socket]);

  const fetchAll = async () => {
    try {
      const [statsRes, trendRes, invRes, invoicesRes, ordersRes, productsRes, lastOrderRes] = await Promise.all([
        axios.get('/retailer/dashboard'),
        axios.get('/retailer/trending'),
        axios.get('/retailer/inventory'),
        axios.get('/retailer/invoices'),
        axios.get('/retailer/orders'),
        axios.get('/retailer/products'),
        axios.get('/retailer/last-order'),
      ]);
      setStats(statsRes.data);
      setTrending(trendRes.data);
      setInventory(invRes.data);
      setInvoices(invoicesRes.data);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
      setLastOrder(lastOrderRes.data);
      setIsBlocked(user?.is_blocked);
    } catch (err) { toast.error('Failed to load dashboard'); }
  };

  const openOrderModal = () => {
    // Pre-fill from last order
    if (lastOrder?.items) {
      setCart(lastOrder.items.map(i => ({
        productId: i.product_id,
        name: i.product_name,
        unitPrice: parseFloat(i.unit_price),
        quantity: i.quantity
      })));
      toast('Pre-filled from your last order!', { icon: '📋' });
    }
    setShowOrderModal(true);
  };

  const addToCart = (product) => {
    const existing = cart.find(c => c.productId === product.id);
    if (existing) setCart(cart.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    else setCart([...cart, { productId: product.id, name: product.name, unitPrice: parseFloat(product.price_per_unit), quantity: 1 }]);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    try {
      const res = await axios.post('/retailer/orders', {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        payment_type: paymentType
      });
      const discount = res.data.discount;
      toast.success(`Order placed! ${discount > 0 ? `10% cash discount: LKR ${discount.toLocaleString()} saved!` : 'Credit order submitted.'}`);
      setShowOrderModal(false);
      setCart([]);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to place order'); }
  };

  const handlePayInvoice = async (id) => {
    try {
      toast.loading('Processing via PayHere...', { duration: 1500 });
      setTimeout(async () => {
        await axios.put(`/retailer/invoices/${id}/pay`);
        toast.success('Payment successful!');
        fetchAll();
      }, 1800);
    } catch (err) { toast.error('Payment failed'); }
  };

  const totalCart = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discount = paymentType === 'cash' ? totalCart * 0.10 : 0;
  const daysUntilDue = (invoice) => Math.ceil((new Date(invoice.due_date) - Date.now()) / 86400000);
  const statusLine = `${stats.lowStockItems || 0} products running low · ${stats.inTransitOrders || 0} orders in transit`;

  return (
    <div className="space-y-6">
      {isBlocked && (
        <div className="bg-red-700 text-white rounded-xl p-5 text-center">
          <AlertTriangle className="inline mr-2" size={20} />
          <strong>Account Suspended</strong> — You have overdue invoices exceeding 14 days. Please clear your balance. Contact your outlet to proceed.
        </div>
      )}

      <DashboardGreeting statusLine={statusLine} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Orders In Transit', value: stats.inTransitOrders || 0, icon: Truck, color: 'border-nestleBlue' },
          { label: 'Unpaid Invoices', value: stats.unpaidInvoices || 0, icon: CreditCard, color: 'border-red-500' },
          { label: 'Low Stock Items', value: stats.lowStockItems || 0, icon: AlertTriangle, color: 'border-orange-500' },
          { label: 'Cash Savings (Year)', value: `LKR ${(stats.cashSavings || 0).toLocaleString()}`, icon: DollarSign, color: 'border-green-500' },
        ].map(k => (
          <div key={k.label} className={`card flex items-center justify-between border-l-4 ${k.color}`}>
            <div><p className="text-xs text-gray-500">{k.label}</p><p className="text-xl font-bold text-gray-800">{k.value}</p></div>
            <k.icon className="text-gray-200" size={28} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trending Products */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="mr-2 text-nestleBlue" size={20} /> Trending in Your Area
          </h3>
          <div className="space-y-3">
            {trending.length === 0 ? <p className="text-xs text-gray-400">No trending data yet</p> : trending.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-7 h-7 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">{i + 1}</div>
                  <div>
                    <p className="font-bold text-sm text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${DEMAND_BADGE[i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low']}`}>
                  {i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low'}
                </span>
              </div>
            ))}
          </div>
          <button onClick={openOrderModal} className="w-full btn btn-primary mt-4 flex items-center justify-center">
            <ShoppingCart size={16} className="mr-2" /> Place New Order
          </button>
        </div>

        {/* Inventory with Burn Rate */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Package className="mr-2 text-nestleBlue" size={20} /> Store Inventory
          </h3>
          <div className="space-y-3 max-h-[360px] overflow-y-auto">
            {inventory.map(inv => {
              const pct = Math.min(100, (inv.quantity / inv.low_stock_threshold) * 100);
              const isLow = pct <= 25;
              return (
                <div key={inv.id} className={`p-3 rounded-lg border ${isLow ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-gray-800">{inv.product_name}</span>
                    <span className={`text-xs font-bold ${isLow ? 'text-red-600' : 'text-gray-600'}`}>{inv.quantity} units</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                    <div className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-red-500' : pct < 50 ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${pct}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{Math.round(pct)}% stocked</span>
                    <span className={inv.days_until_empty < 7 ? 'text-red-600 font-bold' : inv.days_until_empty < 14 ? 'text-yellow-600' : 'text-green-600'}>
                      ~{inv.days_until_empty} days until empty
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoices with 3-day nudge */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <CreditCard className="mr-2 text-nestleBlue" size={20} /> Invoices
          </h3>
          <div className="space-y-3 max-h-[360px] overflow-y-auto">
            {invoices.length === 0 ? <p className="text-gray-400 text-sm">No invoices.</p> : invoices.map(inv => {
              const due = daysUntilDue(inv);
              const isOverdue = inv.status === 'overdue' || due < 0;
              const isDueSoon = inv.status === 'unpaid' && due <= 3 && due >= 0;
              return (
                <div key={inv.id} className={`border rounded-xl p-4 ${isOverdue ? 'border-red-200 bg-red-50' : isDueSoon ? 'border-yellow-200' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-sm text-gray-800">#{inv.id.substring(0,8).toUpperCase()}</p>
                      <p className="text-xs text-gray-500">Due: {new Date(inv.due_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg text-gray-800">LKR {parseFloat(inv.amount).toLocaleString()}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {isDueSoon && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 mb-2 text-xs text-amber-800 font-medium">
                      ⏰ Due in {due} day(s). Pay now to avoid late fee.
                    </div>
                  )}
                  {inv.status !== 'paid' && (
                    <button onClick={() => handlePayInvoice(inv.id)} className="w-full btn bg-black hover:bg-gray-800 text-white text-sm py-1.5">
                      Pay via PayHere
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ActivityLog endpoint="/retailer/activity-logs" />

      {/* Order Modal with pre-fill + payment type */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Order Products</h3>
                {lastOrder && (
                  <div className="mt-1 text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full inline-block">
                    📋 Pre-filled from your last order on {new Date(lastOrder.order.created_at).toLocaleDateString()} — adjust if needed
                  </div>
                )}
              </div>
              <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {/* Payment type selection */}
              <div className="flex gap-3 mb-5">
                <button onClick={() => setPaymentType('cash')} className={`flex-1 py-2 rounded-lg border-2 font-bold text-sm transition ${paymentType === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                  💵 Cash — 10% Discount
                </button>
                <button onClick={() => setPaymentType('credit')} className={`flex-1 py-2 rounded-lg border-2 font-bold text-sm transition ${paymentType === 'credit' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                  💳 Credit — 7-Day Term
                </button>
              </div>

              {/* Product grid with quantity inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {products.map(p => {
                  const cartItem = cart.find(c => c.productId === p.id);
                  const qty = cartItem?.quantity || 0;

                  const setQty = (newQty) => {
                    const val = Math.max(0, parseInt(newQty) || 0);
                    if (val === 0) {
                      setCart(cart.filter(c => c.productId !== p.id));
                    } else if (cartItem) {
                      setCart(cart.map(c => c.productId === p.id ? { ...c, quantity: val } : c));
                    } else {
                      setCart([...cart, { productId: p.id, name: p.name, unitPrice: parseFloat(p.price_per_unit), quantity: val }]);
                    }
                  };

                  return (
                    <div key={p.id} className={`border-2 rounded-xl p-3 transition-all ${qty > 0 ? 'border-nestleBlue bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <div className="mb-2">
                        <p className="font-bold text-sm text-gray-800 leading-tight">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.unit}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm font-black text-nestleBlue">LKR {parseFloat(p.price_per_unit).toLocaleString()}</p>
                          {p.is_trending && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">TRENDING</span>}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => setQty(qty - 1)}
                          disabled={qty === 0}
                          className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-30 font-bold text-gray-700 flex items-center justify-center text-lg leading-none"
                        >−</button>
                        <input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={e => setQty(e.target.value)}
                          className="flex-1 h-7 text-center text-sm font-bold border border-gray-200 rounded-md focus:outline-none focus:border-nestleBlue bg-white w-0"
                        />
                        <button
                          onClick={() => setQty(qty + 1)}
                          className="w-7 h-7 rounded-md bg-nestleBlue hover:bg-blue-700 font-bold text-white flex items-center justify-center text-lg leading-none"
                        >+</button>
                      </div>

                      {qty > 0 && (
                        <p className="text-[10px] text-nestleBlue font-bold mt-1.5 text-right">
                          = LKR {(qty * parseFloat(p.price_per_unit)).toLocaleString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>


              {/* Cart */}
              {cart.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Your Cart</div>
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-center justify-between px-4 py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-800">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCart(cart.map(c => c.productId === item.productId ? {...c, quantity: Math.max(1, c.quantity-1)} : c))} className="w-6 h-6 bg-gray-100 rounded font-bold text-gray-600 hover:bg-gray-200">-</button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button onClick={() => setCart(cart.map(c => c.productId === item.productId ? {...c, quantity: c.quantity+1} : c))} className="w-6 h-6 bg-gray-100 rounded font-bold text-gray-600 hover:bg-gray-200">+</button>
                        <span className="text-sm font-bold w-24 text-right">LKR {(item.quantity*item.unitPrice).toLocaleString()}</span>
                        <button onClick={() => setCart(cart.filter(c => c.productId !== item.productId))} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50 shrink-0">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Subtotal</span><span className="font-bold">LKR {totalCart.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm mb-1 text-green-600">
                  <span>Cash Discount (10%)</span><span className="font-bold">- LKR {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-black mb-4 border-t pt-2">
                <span>Total</span><span className="text-nestleBlue">LKR {(totalCart - discount).toLocaleString()}</span>
              </div>
              <button onClick={handlePlaceOrder} disabled={cart.length === 0} className="w-full btn btn-primary py-3 disabled:opacity-50">
                Submit Order → {user?.province} Outlet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailerDashboard;
