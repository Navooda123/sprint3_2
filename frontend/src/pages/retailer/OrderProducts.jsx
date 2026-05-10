import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, Package, Minus, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const OrderProducts = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentType, setPaymentType] = useState('credit');
  const [lastOrder, setLastOrder] = useState(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, lastOrderRes] = await Promise.all([
        axios.get('/retailer/products'),
        axios.get('/retailer/last-order'),
      ]);
      setProducts(productsRes.data);
      setLastOrder(lastOrderRes.data);
    } catch (err) {
      toast.error('Failed to fetch products');
    }
  };

  const prefillFromLastOrder = () => {
    if (!lastOrder?.items) { toast.error('No previous order found'); return; }
    setCart(lastOrder.items.map(i => ({
      productId: i.product_id,
      name: i.product_name,
      unitPrice: parseFloat(i.unit_price),
      quantity: i.quantity,
    })));
    toast.success(`Pre-filled from last order (${new Date(lastOrder.order.created_at).toLocaleDateString()})`, { icon: '📋' });
  };

  const setQty = (product, newQty) => {
    const val = Math.max(0, parseInt(newQty) || 0);
    const existing = cart.find(c => c.productId === product.id);
    if (val === 0) {
      setCart(cart.filter(c => c.productId !== product.id));
    } else if (existing) {
      setCart(cart.map(c => c.productId === product.id ? { ...c, quantity: val } : c));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        unitPrice: parseFloat(product.price_per_unit),
        quantity: val,
      }]);
    }
  };

  const removeFromCart = (productId) => setCart(cart.filter(c => c.productId !== productId));

  const handlePlaceOrder = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    setIsOrdering(true);
    try {
      const res = await axios.post('/retailer/orders', {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        payment_type: paymentType,
      });
      const discount = res.data.discount || 0;
      toast.success(
        discount > 0
          ? `Order placed! 10% cash discount saved LKR ${discount.toLocaleString()}`
          : 'Order placed successfully! Your outlet will process it shortly.'
      );
      setCart([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setIsOrdering(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCart = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discount = paymentType === 'cash' ? totalCart * 0.10 : 0;
  const finalTotal = totalCart - discount;

  return (
    <div className="flex gap-6 h-full">
      {/* LEFT — Product Catalog */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header bar */}
        <div className="bg-nestleBlue rounded-xl p-5 text-white shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-0.5">Order Products</h2>
            <p className="text-blue-100 text-sm">Ordering from {user?.province} Outlet</p>
          </div>
          <div className="flex items-center gap-3">
            {lastOrder && (
              <button
                onClick={prefillFromLastOrder}
                className="bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-4 py-2 rounded-lg transition"
              >
                📋 Repeat Last Order
              </button>
            )}
            <div className="bg-white/20 p-3 rounded-full">
              <Package size={32} />
            </div>
          </div>
        </div>

        {/* Payment Type Toggle */}
        <div className="card py-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payment Method</p>
          <div className="flex gap-3">
            <button
              onClick={() => setPaymentType('cash')}
              className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                paymentType === 'cash'
                  ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              💵 Cash Payment
              <span className="block text-xs font-medium mt-0.5 opacity-75">10% instant discount</span>
            </button>
            <button
              onClick={() => setPaymentType('credit')}
              className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                paymentType === 'credit'
                  ? 'border-nestleBlue bg-blue-50 text-nestleBlue shadow-sm'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              💳 Credit (7-Day Term)
              <span className="block text-xs font-medium mt-0.5 opacity-75">Invoice sent after dispatch</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search products by name or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nestleBlue bg-white shadow-sm"
        />

        {/* Product Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(p => {
            const cartItem = cart.find(c => c.productId === p.id);
            const qty = cartItem?.quantity || 0;
            const lineTotal = qty * parseFloat(p.price_per_unit);

            return (
              <div
                key={p.id}
                className={`rounded-xl border-2 p-4 transition-all bg-white ${
                  qty > 0
                    ? 'border-nestleBlue shadow-md bg-blue-50/30'
                    : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {/* Product Info */}
                <div className="mb-3">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="font-bold text-gray-800 text-sm leading-tight">{p.name}</h4>
                    {p.is_trending && (
                      <span className="shrink-0 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">HOT</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{p.category} · {p.unit}</p>
                  <p className="text-base font-black text-nestleBlue mt-1.5">
                    LKR {parseFloat(p.price_per_unit).toLocaleString()}
                    <span className="text-xs font-medium text-gray-400 ml-1">/ unit</span>
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setQty(p, qty - 1)}
                    disabled={qty === 0}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-25 font-bold text-gray-600 flex items-center justify-center transition"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={qty === 0 ? '' : qty}
                    placeholder="0"
                    onChange={e => setQty(p, e.target.value)}
                    className="flex-1 h-8 text-center text-sm font-bold border border-gray-200 rounded-lg focus:outline-none focus:border-nestleBlue bg-white min-w-0"
                  />
                  <button
                    onClick={() => setQty(p, qty + 1)}
                    className="w-8 h-8 rounded-lg bg-nestleBlue hover:bg-blue-700 font-bold text-white flex items-center justify-center transition"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Line total */}
                {qty > 0 && (
                  <div className="mt-2 pt-2 border-t border-nestleBlue/20 flex justify-between items-center">
                    <span className="text-xs text-gray-500">{qty} × {parseFloat(p.price_per_unit).toLocaleString()}</span>
                    <span className="text-xs font-black text-nestleBlue">LKR {lineTotal.toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <Package className="mx-auto mb-3 opacity-30" size={48} />
              <p>No products match your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Cart Sidebar */}
      <div className="w-80 shrink-0">
        <div className="card sticky top-0">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <ShoppingCart className="mr-2 text-nestleBlue" size={20} />
            Your Cart
            {cart.length > 0 && (
              <span className="ml-auto bg-nestleBlue text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.length}</span>
            )}
          </h3>

          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart className="mx-auto mb-2 opacity-30" size={36} />
              <p className="text-sm">Add products using the<br />+ buttons on the left</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.quantity} × LKR {item.unitPrice.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-black text-nestleBlue whitespace-nowrap">
                        LKR {(item.quantity * item.unitPrice).toLocaleString()}
                      </span>
                      <button onClick={() => removeFromCart(item.productId)} className="text-red-300 hover:text-red-500 transition">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-3 space-y-1.5 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-bold">LKR {totalCart.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                    <span className="font-bold">💵 Cash Discount (10%)</span>
                    <span className="font-bold">− LKR {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black pt-1 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-nestleBlue">LKR {finalTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={isOrdering}
                className="w-full btn btn-primary py-3 font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isOrdering ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Processing...</>
                ) : (
                  <><ShoppingCart size={18} /> Submit Order</>
                )}
              </button>

              <button
                onClick={() => setCart([])}
                className="w-full text-xs text-red-400 hover:text-red-600 mt-2 transition"
              >
                Clear cart
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderProducts;
