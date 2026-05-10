import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Store, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-700',
  dispatched: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const OutletOrders = () => {
  const [orders, setOrders] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatchModal, setDispatchModal] = useState(null);
  const [selectedTransporter, setSelectedTransporter] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, transRes] = await Promise.all([
        axios.get('/outlet/orders'),
        axios.get('/outlet/available-transporters'),
      ]);
      setOrders(ordersRes.data);
      setTransporters(transRes.data);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  const handleDispatch = async () => {
    if (!dispatchModal) return;
    try {
      await axios.put(`/outlet/orders/${dispatchModal.id}/dispatch`, { transporter_id: selectedTransporter || null });
      toast.success('Order dispatched! Invoice created.');
      setDispatchModal(null);
      setSelectedTransporter('');
      fetchData();
    } catch { toast.error('Dispatch failed'); }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="space-y-6">
      <div className="bg-nestleBlue rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Retailer Orders</h2>
          <p className="text-blue-100 text-sm">{orders.filter(o => o.status === 'pending').length} pending · {transporters.length} transporters free</p>
        </div>
        <div className="bg-white/20 p-4 rounded-full"><Store size={36} /></div>
      </div>

      <div className="flex gap-2">
        {['all', 'pending', 'dispatched', 'delivered'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filter === f ? 'bg-nestleBlue text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-nestleBlue border-t-transparent"></div></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400"><p>No {filter === 'all' ? '' : filter} orders.</p></div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => (
            <div key={order.id} className="card p-0 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
                <div>
                  <p className="font-bold text-gray-800">{order.retailer_name}</p>
                  <p className="text-xs text-gray-400">Order #{order.id.substring(0,8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${STATUS_STYLE[order.status] || 'bg-gray-100'}`}>{order.status}</span>
                  <span className="font-black text-nestleBlue text-lg">LKR {parseFloat(order.total_amount).toLocaleString()}</span>
                </div>
              </div>
              <div className="px-6 py-4">
                {order.items?.length > 0 && (
                  <ul className="text-sm text-gray-600 space-y-1 mb-3">
                    {order.items.map(item => (
                      <li key={item.id} className="flex justify-between">
                        <span>{item.product_name} × {item.quantity}</span>
                        <span className="text-gray-500">LKR {(item.quantity * item.unit_price).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {order.status === 'pending' && (
                  <button onClick={() => { setDispatchModal(order); setSelectedTransporter(''); }}
                    className="btn btn-primary flex items-center gap-2 text-sm">
                    <Truck size={15} /> Dispatch Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-1">Dispatch Order</h3>
            <p className="text-sm text-gray-500 mb-4">to {dispatchModal.retailer_name} · LKR {parseFloat(dispatchModal.total_amount).toLocaleString()}</p>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Transporter <span className="text-gray-400 font-normal">(optional)</span></label>
            <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm mb-4"
              value={selectedTransporter} onChange={e => setSelectedTransporter(e.target.value)}>
              <option value="">-- No transporter (self-pickup) --</option>
              {transporters.map(t => (
                <option key={t.id} value={t.id}>{t.name} · {t.vehicle_number}</option>
              ))}
            </select>
            {selectedTransporter && <p className="text-xs text-green-600 mb-3">✓ GPS tracking will be enabled for the retailer</p>}
            <div className="flex gap-3">
              <button onClick={handleDispatch} className="flex-1 btn btn-primary">Dispatch & Create Invoice</button>
              <button onClick={() => setDispatchModal(null)} className="btn border border-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutletOrders;
