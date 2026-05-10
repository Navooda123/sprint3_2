import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import DashboardGreeting from '../../components/shared/DashboardGreeting';
import ActivityLog from '../../components/shared/ActivityLog';
import toast from 'react-hot-toast';
import { 
  ShoppingCart, AlertTriangle, TrendingUp, Truck, Users,
  CheckCircle, X, Plus, ChevronDown, MapPin
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const PROVINCES = ['Western', 'Central', 'Southern', 'Northern', 'Eastern'];

const healthColor = { green: 'bg-green-100 border-green-400', amber: 'bg-yellow-50 border-yellow-400', red: 'bg-red-50 border-red-400' };
const healthText = { green: 'text-green-700', amber: 'text-yellow-700', red: 'text-red-700' };
const healthDot = { green: 'bg-green-500', amber: 'bg-yellow-500', red: 'bg-red-500' };

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [blockedRetailers, setBlockedRetailers] = useState([]);
  const [provinceHealth, setProvinceHealth] = useState([]);
  const [trending, setTrending] = useState({});
  const [transporters, setTransporters] = useState([]);
  const [assignModal, setAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ transporter_id: '', from_location: 'Nestlé Factory — Kurunegala', to_location: '', outlet_id: '', payment_amount: 5000 });
  const [outlets, setOutlets] = useState([]);
  const [payModal, setPayModal] = useState(null);
  const [bids, setBids] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const socket = useSocket();

  useEffect(() => {
    fetchAll();
    if (socket) {
      socket.on('journey:breakdown', (d) => toast.error(`🚨 BREAKDOWN: ${d.transporter} — ${d.province} Province`));
      socket.on('delivery_confirmed', (d) => { toast.success(`Farmer marked delivery: ${d.material}`); fetchAll(); });
      socket.on('journey:ended', () => fetchAll());
    }
    return () => {
      if (socket) { socket.off('journey:breakdown'); socket.off('delivery_confirmed'); socket.off('journey:ended'); }
    };
  }, [socket]);

  const fetchAll = async () => {
    try {
      const [dashRes, blockedRes, healthRes, trendRes, transRes, bidsRes] = await Promise.all([
        axios.get('/admin/dashboard'),
        axios.get('/admin/blocked-retailers'),
        axios.get('/admin/province-health'),
        axios.get('/admin/trending-products'),
        axios.get('/admin/available-transporters'),
        axios.get('/admin/bids'),
      ]);
      const outletUsers = await axios.get('/admin/products'); // reuse auth — fetch outlet list via users
      setData(dashRes.data);
      setBlockedRetailers(blockedRes.data);
      setProvinceHealth(healthRes.data);
      setTrending(trendRes.data);
      setTransporters(transRes.data);
      setBids(bidsRes.data.filter(b => b.status === 'delivered'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (id) => {
    try {
      await axios.put(`/admin/retailers/${id}/unblock`);
      toast.success('Retailer account restored!');
      fetchAll();
    } catch (err) { toast.error('Failed to unblock'); }
  };

  const handleConfirmDelivery = async (bidId) => {
    try {
      await axios.put(`/admin/bids/${bidId}/confirm-delivery`);
      toast.success('Delivery confirmed & payment released to farmer!');
      setPayModal(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleAssignTransporter = async () => {
    try {
      await axios.post('/admin/journeys/assign', assignForm);
      toast.success('Transporter assigned successfully!');
      setAssignModal(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to assign'); }
  };

  const kpis = data?.kpis;
  const statusLine = kpis ? `${kpis.activeTransporters} deliveries in transit · ${kpis.overdueInvoices} overdue invoices · ${kpis.blockedRetailers} unblock requests` : '';

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-4 border-nestleBlue border-t-transparent"></div></div>;

  return (
    <div className="space-y-6">
      <DashboardGreeting statusLine={statusLine} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: kpis?.totalOrders || 0, icon: ShoppingCart, color: 'bg-blue-500' },
          { label: 'Active Transporters', value: kpis?.activeTransporters || 0, icon: Truck, color: 'bg-green-500' },
          { label: 'Overdue Invoices', value: kpis?.overdueInvoices || 0, icon: AlertTriangle, color: 'bg-red-500' },
          { label: 'Blocked Retailers', value: kpis?.blockedRetailers || 0, icon: Users, color: 'bg-orange-500' },
        ].map((k) => (
          <div key={k.label} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className={`p-3 rounded-lg mr-4 ${k.color}`}><k.icon className="text-white w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500 font-medium">{k.label}</p><p className="text-2xl font-bold text-gray-800">{k.value}</p></div>
          </div>
        ))}
      </div>

      {/* Pending Farmer Deliveries — Confirm & Pay */}
      {bids.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center">
            <CheckCircle className="mr-2" size={20} /> Farmer Deliveries Awaiting Confirmation
          </h3>
          <div className="space-y-3">
            {bids.map(bid => (
              <div key={bid.id} className="bg-white border border-yellow-100 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">{bid.material_name} — {bid.quantity} {bid.unit}</p>
                  <p className="text-sm text-gray-500">Farmer: {bid.farmer_name || 'Unknown'} · Total: LKR {parseFloat(bid.bid_amount).toLocaleString()}</p>
                </div>
                <button onClick={() => setPayModal(bid)} className="btn bg-green-500 hover:bg-green-600 text-white">
                  Confirm Receipt &amp; Pay
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Province Health Heatmap */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Province Health Monitor</h3>
          <button onClick={fetchAll} className="text-xs text-nestleBlue hover:underline">↻ Refresh</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {provinceHealth.map(p => (
            <div key={p.province} className={`border-l-4 rounded-lg p-4 ${healthColor[p.health]}`}>
              <div className="flex items-center mb-2">
                <div className={`w-2.5 h-2.5 rounded-full mr-2 ${healthDot[p.health]}`}></div>
                <span className={`text-sm font-bold ${healthText[p.health]}`}>{p.province}</span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Stock: <strong>{p.stockPct}%</strong></div>
                <div>Deliveries: <strong>{p.activeDeliveries}</strong></div>
                <div>Overdue: <strong>{p.overdueInvoices}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transporter Assignment + Trending Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assign Transporter */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <Truck className="mr-2 text-nestleBlue" size={20} /> Assign Transporter
            </h3>
            <button onClick={() => setAssignModal(true)} className="btn btn-primary flex items-center text-sm">
              <Plus size={16} className="mr-1" /> New Assignment
            </button>
          </div>
          <p className="text-sm text-gray-500">
            {transporters.length} transporter(s) available. Click above to dispatch goods from factory to an outlet.
          </p>
        </div>

        {/* Trending Products */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="mr-2 text-nestleBlue" size={20} /> Trending by Province
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {PROVINCES.map(prov => (
              <div key={prov}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{prov}</p>
                <div className="space-y-1 pl-2">
                  {(trending[prov] || []).map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <span className="w-5 h-5 bg-gray-100 text-gray-500 rounded-full text-xs flex items-center justify-center mr-2 font-bold">{i + 1}</span>
                        <span className="text-gray-800">{p.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        p.demand === 'High' ? 'bg-red-100 text-red-700' :
                        p.demand === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{p.demand}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Orders per Province</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.ordersPerProvince || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="province" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#009FDA" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <ActivityLog endpoint="/admin/activity-logs" />
      </div>

      {/* Blocked Retailers */}
      {blockedRetailers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-red-200 bg-red-100 flex items-center">
            <AlertTriangle className="text-red-600 mr-2" />
            <h3 className="text-lg font-bold text-red-800">Suspended Accounts (Overdue &gt; 14 days)</h3>
          </div>
          <div className="p-5 space-y-3">
            {blockedRetailers.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-red-100">
                <div>
                  <h4 className="font-bold text-gray-800">{r.name}</h4>
                  <p className="text-sm text-gray-500">{r.province} · {r.email}</p>
                  <p className="text-xs text-red-500 font-bold mt-1">{r.blocked_reason}</p>
                </div>
                <button onClick={() => handleUnblock(r.id)} className="btn bg-green-500 hover:bg-green-600 text-white">
                  Confirm Payment &amp; Unblock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Delivery &amp; Release Payment</h3>
            <div className="space-y-2 mb-5 text-sm text-gray-700">
              <div className="flex justify-between"><span>Farmer:</span><strong>{payModal.farmer_name}</strong></div>
              <div className="flex justify-between"><span>Material:</span><strong>{payModal.material_name}</strong></div>
              <div className="flex justify-between"><span>Quantity:</span><strong>{payModal.quantity} {payModal.unit}</strong></div>
              <div className="flex justify-between pt-2 border-t border-gray-100 text-lg">
                <span className="font-bold">Payment Amount:</span>
                <span className="font-black text-green-600">LKR {parseFloat(payModal.bid_amount).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleConfirmDelivery(payModal.id)} className="flex-1 btn bg-green-500 hover:bg-green-600 text-white">
                Release LKR {parseFloat(payModal.bid_amount).toLocaleString()} to Farmer
              </button>
              <button onClick={() => setPayModal(null)} className="btn border border-gray-300 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Transporter Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Assign Transporter — Factory to Outlet</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Transporter</label>
                <select className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  value={assignForm.transporter_id}
                  onChange={e => setAssignForm({...assignForm, transporter_id: e.target.value})}>
                  <option value="">-- Select --</option>
                  {transporters.map(t => (
                    <option key={t.id} value={t.id}>{t.name} · {t.vehicle_number} ({t.province})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Outlet</label>
                <select className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  value={assignForm.to_location}
                  onChange={e => setAssignForm({...assignForm, to_location: e.target.value, outlet_id: e.target.options[e.target.selectedIndex].dataset.id})}>
                  <option value="">-- Select Outlet --</option>
                  {['Nestlé Outlet — Western','Nestlé Outlet — Central','Nestlé Outlet — Southern','Nestlé Outlet — Northern','Nestlé Outlet — Eastern'].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (LKR)</label>
                <input type="number" className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  value={assignForm.payment_amount}
                  onChange={e => setAssignForm({...assignForm, payment_amount: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAssignTransporter} className="flex-1 btn btn-primary">Assign &amp; Notify</button>
                <button onClick={() => setAssignModal(false)} className="btn border border-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
