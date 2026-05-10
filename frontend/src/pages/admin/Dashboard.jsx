import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Package, Truck, AlertCircle, Clock, TrendingUp, Users, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const AdminDashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKpis();
  }, []);

  const fetchKpis = async () => {
    try {
      const res = await axios.get('/admin/dashboard');
      setKpis(res.data.kpis);
    } catch (error) {
      console.error('Failed to fetch KPIs', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Western', orders: 450 },
    { name: 'Central', orders: 300 },
    { name: 'Southern', orders: 200 },
    { name: 'Northern', orders: 150 },
    { name: 'Eastern', orders: 120 },
  ];

  if (loading) return <div className="flex items-center justify-center h-full"><p className="text-gray-500 animate-pulse">Loading dashboard data...</p></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-800">Global Overview</h1>
        <p className="text-gray-500 font-medium">Real-time supply chain performance across Sri Lanka</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card border-l-4 border-nestleBlue flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase">Total Orders</p>
            <h3 className="text-3xl font-black text-gray-800">{kpis?.totalOrders || 0}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-nestleBlue rounded-2xl"><Package size={28} /></div>
        </div>

        <div className="card border-l-4 border-green-500 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase">Active Trucks</p>
            <h3 className="text-3xl font-black text-gray-800">{kpis?.activeTransporters || 0}</h3>
          </div>
          <div className="p-3 bg-green-50 text-green-500 rounded-2xl"><Truck size={28} /></div>
        </div>

        <div className="card border-l-4 border-nestleRed flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase">Overdue Invoices</p>
            <h3 className="text-3xl font-black text-gray-800">{kpis?.overdueInvoices || 0}</h3>
          </div>
          <div className="p-3 bg-red-50 text-nestleRed rounded-2xl"><Clock size={28} /></div>
        </div>

        <div className="card border-l-4 border-yellow-500 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase">Stock Alerts</p>
            <h3 className="text-3xl font-black text-gray-800">{kpis?.lowStockAlerts || 0}</h3>
          </div>
          <div className="p-3 bg-yellow-50 text-yellow-500 rounded-2xl"><AlertCircle size={28} /></div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2"><MapPin size={20} className="text-nestleBlue" /> Orders by Province</h4>
            <span className="text-xs font-bold text-gray-400 uppercase">Last 30 Days</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="orders" fill="#009FDA" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2"><TrendingUp size={20} className="text-green-500" /> Revenue Growth</h4>
            <span className="text-xs font-bold text-gray-400 uppercase">Real-time</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="orders" stroke="#009FDA" strokeWidth={4} dot={{r: 6, fill: '#009FDA', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8, strokeWidth: 0}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="card">
        <h4 className="text-lg font-bold text-gray-800 mb-6">Recent System Logs</h4>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-nestleBlue flex items-center justify-center font-bold">A</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">Admin published new bid for <span className="text-nestleBlue">Fresh Milk</span></p>
                <p className="text-xs text-gray-400 font-medium">2 minutes ago • Western Province</p>
              </div>
              <button className="text-xs font-bold text-gray-400 group-hover:text-nestleBlue transition-colors">Details</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
