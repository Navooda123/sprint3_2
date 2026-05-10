import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import DashboardGreeting from '../../components/shared/DashboardGreeting';
import ActivityLog from '../../components/shared/ActivityLog';
import { Store, Package, AlertCircle, Truck, CheckCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const HEALTH_BADGE = {
  Good: 'bg-green-100 text-green-700',
  Fair: 'bg-yellow-100 text-yellow-700',
  'At Risk': 'bg-red-100 text-red-700',
};

const OutletDashboard = () => {
  const [dashStats, setDashStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [healthScores, setHealthScores] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [availableTransporters, setAvailableTransporters] = useState([]);
  const [breakdownAlert, setBreakdownAlert] = useState(null);
  // Dispatch modal state
  const [dispatchModal, setDispatchModal] = useState(null); // order object
  const [selectedTransporter, setSelectedTransporter] = useState('');

  const { user } = useAuth();
  const socket = useSocket();

  useEffect(() => {
    fetchAll();
    if (socket) {
      socket.on('new_order', () => { toast.success('New retailer order received!'); fetchAll(); });
      socket.on('journey:breakdown', (d) => {
        setBreakdownAlert(d);
        toast.error(`🚨 Breakdown: ${d.transporter} — ${d.location}`);
      });
    }
    return () => { if (socket) { socket.off('new_order'); socket.off('journey:breakdown'); } };
  }, [socket]);

  const fetchAll = async () => {
    try {
      const [statsRes, ordersRes, invRes, alertsRes, healthRes, forecastRes, transRes] = await Promise.all([
        axios.get('/outlet/dashboard'),
        axios.get('/outlet/orders'),
        axios.get('/outlet/inventory'),
        axios.get('/outlet/low-stock-alerts'),
        axios.get('/outlet/retailer-health'),
        axios.get('/outlet/demand-forecast'),
        axios.get('/outlet/available-transporters'),
      ]);
      setDashStats(statsRes.data);
      setOrders(ordersRes.data);
      setInventory(invRes.data);
      setAlerts(alertsRes.data);
      setHealthScores(healthRes.data);
      setForecast(forecastRes.data);
      setAvailableTransporters(transRes.data);
    } catch (err) { toast.error('Failed to load data'); }
  };

  const handleDispatch = async () => {
    if (!dispatchModal) return;
    try {
      await axios.put(`/outlet/orders/${dispatchModal.id}/dispatch`, {
        transporter_id: selectedTransporter || null
      });
      toast.success('Order dispatched! Invoice created and sent to retailer.');
      setDispatchModal(null);
      setSelectedTransporter('');
      fetchAll();
    } catch (err) { toast.error('Failed to dispatch'); }
  };

  const statusLine = `${dashStats.incomingOrders || 0} retailer orders · ${dashStats.overdueInvoices || 0} invoices overdue`;
  const pendingOrders = orders.filter(o => o.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Breakdown Alert Banner */}
      {breakdownAlert && (
        <div className="bg-red-600 text-white p-4 rounded-xl flex items-start justify-between shadow-lg">
          <div className="flex items-start">
            <AlertCircle className="mr-3 mt-0.5 shrink-0" size={22} />
            <div>
              <p className="font-bold text-lg">⚠️ Vehicle Breakdown in Your Province!</p>
              <p className="text-sm text-red-100">
                Transporter <strong>{breakdownAlert.transporter}</strong> ({breakdownAlert.vehicle}) broke down near {breakdownAlert.location}. 
                Delivery to <strong>{breakdownAlert.destination}</strong> may be delayed.
              </p>
            </div>
          </div>
          <button onClick={() => setBreakdownAlert(null)} className="text-red-200 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}

      <DashboardGreeting statusLine={statusLine} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Orders', value: dashStats.incomingOrders || 0, icon: Store, color: 'border-yellow-400' },
          { label: 'Inventory Items', value: inventory.length, icon: Package, color: 'border-nestleBlue' },
          { label: 'Overdue Invoices', value: dashStats.overdueInvoices || 0, icon: AlertCircle, color: 'border-red-500' },
          { label: 'Alerts', value: alerts.length, icon: AlertCircle, color: 'border-orange-500' },
        ].map(k => (
          <div key={k.label} className={`card flex items-center justify-between border-l-4 ${k.color}`}>
            <div><p className="text-xs text-gray-500">{k.label}</p><p className="text-2xl font-bold">{k.value}</p></div>
            <k.icon className="text-gray-300" size={28} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Queue */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Store className="mr-2 text-nestleBlue" size={20} /> Retailer Orders ({pendingOrders.length} pending)
          </h3>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {orders.length === 0 ? <p className="text-gray-400 text-sm">No orders.</p> : orders.map(order => (
              <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 flex justify-between items-center border-b">
                  <div>
                    <span className="font-bold text-gray-800 text-sm">{order.retailer_name}</span>
                    <span className="text-xs text-gray-400 ml-2">{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>{order.status}</span>
                </div>
                <div className="p-3">
                  <ul className="text-xs text-gray-600 space-y-0.5 mb-2">
                    {order.items?.map(item => (
                      <li key={item.id} className="flex justify-between">
                        <span>{item.product_name} ×{item.quantity}</span>
                        <span>LKR {(item.quantity * item.unit_price).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="font-bold text-sm text-nestleBlue">LKR {parseFloat(order.total_amount).toLocaleString()}</span>
                    {order.status === 'pending' && (
                      <button onClick={() => setDispatchModal(order)} className="btn btn-primary py-1 px-3 text-xs flex items-center">
                        <Truck size={12} className="mr-1" /> Dispatch
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Retailer Health Scores */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="mr-2 text-nestleBlue" size={20} /> Retailer Health Scores
          </h3>
          <div className="space-y-3">
            {healthScores.length === 0 ? <p className="text-gray-400 text-sm">No retailers in your province.</p> :
            healthScores.map(r => (
              <div key={r.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-800 text-sm">{r.name}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${HEALTH_BADGE[r.healthBadge]}`}>{r.healthBadge}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div className="text-center">
                    <p className="font-black text-lg text-gray-800">{r.paymentReliability}%</p>
                    <p>On-time Pay</p>
                  </div>
                  <div className="text-center">
                    <p className="font-black text-lg text-blue-600">{r.cashRatio}%</p>
                    <p>Cash Orders</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-black text-lg ${r.overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{r.overdueCount}</p>
                    <p>Overdue (6mo)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demand Forecast */}
      {forecast.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Demand Forecast — Predicted Low-Stock Dates</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Retailer', 'Product', 'Current Stock', 'Days Until Empty', 'Predicted Date'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forecast.map((f, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{f.retailer_name}</td>
                    <td className="px-4 py-3 text-gray-600">{f.product_name}</td>
                    <td className="px-4 py-3 text-gray-600">{f.current_stock}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        f.days_until_empty < 7 ? 'bg-red-100 text-red-700' :
                        f.days_until_empty < 14 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>~{f.days_until_empty} days</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{f.predicted_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ActivityLog endpoint="/outlet/activity-logs" />

      {/* Dispatch Modal with Transporter Selection */}
      {dispatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-1">Dispatch Order</h3>
            <p className="text-sm text-gray-500 mb-4">to {dispatchModal.retailer_name}</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-bold text-nestleBlue text-lg">LKR {parseFloat(dispatchModal.total_amount).toLocaleString()}</p>
              <p className="text-gray-500 text-xs">7-day credit invoice will be created</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Transporter <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select className="w-full border border-gray-300 rounded-md p-2 text-sm"
                value={selectedTransporter}
                onChange={e => setSelectedTransporter(e.target.value)}>
                <option value="">-- No transporter (self-pickup) --</option>
                {availableTransporters.map(t => (
                  <option key={t.id} value={t.id}>{t.name} · {t.vehicle_number}</option>
                ))}
              </select>
              {selectedTransporter && (
                <p className="text-xs text-green-600 mt-1">✓ Transporter will be notified and GPS tracking enabled for retailer</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleDispatch} className="flex-1 btn btn-primary">Dispatch &amp; Create Invoice</button>
              <button onClick={() => setDispatchModal(null)} className="btn border border-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutletDashboard;
