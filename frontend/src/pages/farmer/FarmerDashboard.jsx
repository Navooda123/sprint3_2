import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import DashboardGreeting from '../../components/shared/DashboardGreeting';
import ActivityLog from '../../components/shared/ActivityLog';
import { ClipboardList, DollarSign, CheckCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const FarmerDashboard = () => {
  const [bids, setBids] = useState([]);
  const [winRate, setWinRate] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const socket = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
    if (socket) {
      socket.on('new_bid', () => { toast.success('New bid posted!'); fetchData(); });
      socket.on('farmer:payment_released', (d) => {
        toast.success(`💰 Payment of LKR ${parseFloat(d.amount).toLocaleString()} received for ${d.material}!`);
        fetchData();
      });
    }
    return () => { if (socket) { socket.off('new_bid'); socket.off('farmer:payment_released'); } };
  }, [socket]);

  const fetchData = async () => {
    try {
      const [bidsRes, wrRes, earningsRes] = await Promise.all([
        axios.get('/farmer/bids'),
        axios.get('/farmer/win-rate'),
        axios.get('/farmer/earnings-summary'),
      ]);
      setBids(bidsRes.data);
      setWinRate(wrRes.data);
      setEarnings(earningsRes.data);
    } catch (err) { toast.error('Failed to load data'); }
  };

  const handleAcceptBid = async (id) => {
    try {
      await axios.put(`/farmer/bids/${id}/accept`);
      toast.success('Bid accepted!');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleMarkDelivered = async (id) => {
    try {
      await axios.put(`/farmer/bids/${id}/mark-delivered`);
      toast.success('Marked as delivered! Admin will confirm.');
      fetchData();
    } catch (err) { toast.error('Failed'); }
  };

  const openBids = bids.filter(b => b.status === 'open').length;
  const myPending = bids.filter(b => b.accepted_by === user?.id && b.status !== 'paid').length;
  const winRatePct = winRate ? (winRate.total > 0 ? Math.round((winRate.accepted / winRate.total) * 100) : 0) : 0;

  return (
    <div className="space-y-6">
      <DashboardGreeting statusLine={`${openBids} bids open · ${myPending} pending payments`} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center justify-between border-l-4 border-nestleBlue">
          <div><p className="text-xs text-gray-500 font-medium">Open Bids</p><p className="text-2xl font-bold text-gray-800">{openBids}</p></div>
          <ClipboardList className="text-nestleBlue" size={28} />
        </div>
        <div className="card flex items-center justify-between border-l-4 border-green-500">
          <div><p className="text-xs text-gray-500 font-medium">Win Rate</p><p className="text-2xl font-bold text-gray-800">{winRatePct}%</p></div>
          <TrendingUp className="text-green-500" size={28} />
        </div>
        <div className="card flex items-center justify-between border-l-4 border-yellow-500">
          <div><p className="text-xs text-gray-500 font-medium">This Month</p><p className="text-2xl font-bold text-gray-800">LKR {(earnings?.thisMonth || 0).toLocaleString()}</p></div>
          <DollarSign className="text-yellow-500" size={28} />
        </div>
        <div className="card flex items-center justify-between border-l-4 border-purple-500">
          <div><p className="text-xs text-gray-500 font-medium">This Year</p><p className="text-2xl font-bold text-gray-800">LKR {(earnings?.thisYear || 0).toLocaleString()}</p></div>
          <CheckCircle className="text-purple-500" size={28} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bid Board */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Bid Board</h3>
          <div className="space-y-3 max-h-[480px] overflow-y-auto">
            {bids.length === 0 ? <p className="text-gray-500">No bids available.</p> : bids.map(bid => (
              <div key={bid.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-gray-800">{bid.material_name} — {bid.quantity}{bid.unit}</h4>
                    <p className="text-sm text-gray-500">LKR {parseFloat(bid.bid_amount).toLocaleString()} · {bid.bid_type === 'open_bid' ? 'Open Bid' : 'Direct Contract'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                    bid.status === 'open' ? 'bg-blue-100 text-blue-700' :
                    bid.status === 'accepted' ? 'bg-yellow-100 text-yellow-700' :
                    bid.status === 'delivered' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>{bid.status}</span>
                </div>
                <div className="flex gap-2">
                  {bid.status === 'open' && <button onClick={() => handleAcceptBid(bid.id)} className="btn btn-primary py-1 text-sm">Accept Bid</button>}
                  {bid.status === 'accepted' && bid.accepted_by === user?.id && <button onClick={() => handleMarkDelivered(bid.id)} className="btn bg-orange-500 hover:bg-orange-600 text-white py-1 text-sm">Mark Delivered</button>}
                  {bid.status === 'delivered' && bid.accepted_by === user?.id && <span className="text-sm font-bold text-orange-500">Awaiting Admin Confirmation</span>}
                  {bid.status === 'paid' && bid.accepted_by === user?.id && <span className="text-sm font-bold text-green-600">✓ Paid</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Win Rate + Earnings */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-base font-bold text-gray-800 mb-3">Bid Win Rate by Material</h3>
            {winRate?.byMaterial?.length > 0 ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={winRate.byMaterial}>
                    <XAxis dataKey="material_name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#009FDA" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-xs text-gray-400">No bid data yet</p>}
            <div className="mt-3 flex justify-between text-sm text-gray-600">
              <span>Total Bids: <strong>{winRate?.total || 0}</strong></span>
              <span>Accepted: <strong>{winRate?.accepted || 0}</strong></span>
              <span>Win Rate: <strong className="text-green-600">{winRatePct}%</strong></span>
            </div>
          </div>

          <div className="card">
            <h3 className="text-base font-bold text-gray-800 mb-3">Monthly Earnings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">This Month</span><span className="font-bold text-green-600">LKR {(earnings?.thisMonth || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Last Month</span><span className="font-bold text-gray-700">LKR {(earnings?.lastMonth || 0).toLocaleString()}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-gray-500">This Year Total</span><span className="font-black text-nestleBlue">LKR {(earnings?.thisYear || 0).toLocaleString()}</span></div>
            </div>
            {earnings?.byMaterial?.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase">By Material</p>
                {earnings.byMaterial.map(m => (
                  <div key={m.material_name} className="flex justify-between text-xs text-gray-600 py-0.5">
                    <span>{m.material_name}</span><span className="font-bold">LKR {parseFloat(m.total).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ActivityLog endpoint="/farmer/activity-logs" />
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
