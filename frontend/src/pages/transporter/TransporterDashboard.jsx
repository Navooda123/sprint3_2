import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import DashboardGreeting from '../../components/shared/DashboardGreeting';
import ActivityLog from '../../components/shared/ActivityLog';
import { Truck, MapPin, AlertTriangle, CheckCircle, Navigation, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const TransporterDashboard = () => {
  const [journeys, setJourneys] = useState([]);
  const [activeJourney, setActiveJourney] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [location, setLocation] = useState({ lat: 6.9271, lng: 79.8612 });
  const [breakdownForm, setBreakdownForm] = useState({ open: false, description: '', estimated_repair_time: '' });
  const socket = useSocket();

  useEffect(() => {
    fetchData();
    if (socket) {
      socket.on('transporter:assigned', (d) => {
        toast.success(`New journey assigned: ${d.from_location} → ${d.to_location}`);
        fetchData();
      });
    }
    return () => { if (socket) socket.off('transporter:assigned'); };
  }, [socket]);

  // GPS simulation interval
  useEffect(() => {
    let interval;
    if (isSimulating && activeJourney) {
      interval = setInterval(() => {
        setLocation(prev => {
          const newLat = prev.lat + (Math.random() - 0.5) * 0.008;
          const newLng = prev.lng + (Math.random() - 0.5) * 0.008;
          axios.post(`/transporter/journeys/${activeJourney.id}/gps`, {
            latitude: newLat, longitude: newLng, speed: Math.floor(Math.random() * 50) + 30
          }).catch(() => {});
          return { lat: newLat, lng: newLng };
        });
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isSimulating, activeJourney]);

  const fetchData = async () => {
    try {
      const [journeysRes, earningsRes, activeRes] = await Promise.all([
        axios.get('/transporter/journeys'),
        axios.get('/transporter/earnings'),
        axios.get('/transporter/journeys/active'),
      ]);
      setJourneys(journeysRes.data);
      setEarnings(earningsRes.data);
      const active = activeRes.data;
      setActiveJourney(active);
      if (active && ['departed', 'in_transit'].includes(active.status)) {
        setIsSimulating(true);
      }
    } catch (err) { toast.error('Failed to load data'); }
  };

  const handleAction = async (id, action) => {
    try {
      await axios.put(`/transporter/journeys/${id}/${action}`);
      if (action === 'depart') { toast.success('Journey started! GPS tracking enabled.'); setIsSimulating(true); }
      else if (action === 'arrive') { toast.success('Arrived at destination!'); setIsSimulating(false); }
      else if (action === 'complete') { toast.success('Journey completed! Payment received.'); setIsSimulating(false); setActiveJourney(null); }
      fetchData();
    } catch (err) { toast.error(`Failed to ${action}`); }
  };

  const handleBreakdown = async () => {
    try {
      await axios.put(`/transporter/journeys/${activeJourney.id}/breakdown`, {
        description: breakdownForm.description,
        latitude: location.lat,
        longitude: location.lng,
        estimated_repair_time: breakdownForm.estimated_repair_time
      });
      toast.error('Breakdown reported! Emergency alerts sent to Admin and Outlet.');
      setBreakdownForm({ open: false, description: '', estimated_repair_time: '' });
      setIsSimulating(false);
      fetchData();
    } catch (err) { toast.error('Failed to report breakdown'); }
  };

  const totalEarnings = earnings.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const statusLine = activeJourney ? `Active journey: ${activeJourney.from_location} → ${activeJourney.to_location}` : 'No active journey assigned';

  return (
    <div className="space-y-6">
      <DashboardGreeting statusLine={statusLine} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center justify-between border-l-4 border-nestleBlue">
          <div><p className="text-xs text-gray-500">Total Journeys</p><p className="text-2xl font-bold">{journeys.length}</p></div>
          <Truck className="text-nestleBlue" size={28} />
        </div>
        <div className="card flex items-center justify-between border-l-4 border-green-500">
          <div><p className="text-xs text-gray-500">Completed</p><p className="text-2xl font-bold">{journeys.filter(j => j.status === 'completed').length}</p></div>
          <CheckCircle className="text-green-500" size={28} />
        </div>
        <div className="card flex items-center justify-between border-l-4 border-yellow-500">
          <div><p className="text-xs text-gray-500">Total Earned</p><p className="text-xl font-bold">LKR {totalEarnings.toLocaleString()}</p></div>
          <DollarSign className="text-yellow-500" size={28} />
        </div>
        <div className="card flex items-center justify-between border-l-4 border-red-500">
          <div><p className="text-xs text-gray-500">Breakdowns</p><p className="text-2xl font-bold">{journeys.filter(j => j.breakdown_reported).length}</p></div>
          <AlertTriangle className="text-red-500" size={28} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Journey Panel */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Navigation className="mr-2 text-nestleBlue" size={20} /> Current Assignment
          </h3>

          {!activeJourney && (
            <div className="text-center py-12 text-gray-400">
              <Truck className="mx-auto mb-3 text-gray-200" size={56} />
              <p className="font-medium">No active assignment</p>
              <p className="text-sm mt-1">You'll be notified when a new journey is assigned</p>
            </div>
          )}

          {activeJourney && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-nestleBlue/5 p-4 border-b flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Route</p>
                  <p className="font-bold text-lg text-gray-800">
                    {activeJourney.from_location} <span className="text-gray-400 mx-2">→</span> {activeJourney.to_location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase">Payment</p>
                  <p className="font-black text-green-600 text-xl">LKR {parseFloat(activeJourney.payment_amount).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-5">
                {/* Status badge */}
                <div className="mb-5">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${
                    activeJourney.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                    activeJourney.status === 'departed' ? 'bg-yellow-100 text-yellow-700' :
                    activeJourney.status === 'arrived' ? 'bg-green-100 text-green-700' :
                    activeJourney.status === 'breakdown' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{activeJourney.status}</span>
                </div>

                {/* GPS indicator */}
                {isSimulating && (
                  <div className="mb-5 flex items-center bg-blue-50 text-blue-800 p-3 rounded-lg text-sm font-medium">
                    <span className="relative flex h-3 w-3 mr-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                    GPS Live: {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {activeJourney.status === 'assigned' && (
                    <button onClick={() => handleAction(activeJourney.id, 'depart')} className="col-span-2 btn bg-nestleBlue hover:bg-blue-700 text-white py-3 font-bold">
                      Start Journey &amp; Enable GPS Tracking
                    </button>
                  )}
                  {(activeJourney.status === 'departed' || activeJourney.status === 'in_transit') && (
                    <>
                      <button onClick={() => handleAction(activeJourney.id, 'arrive')} className="btn bg-green-500 hover:bg-green-600 text-white py-3">
                        <MapPin className="inline mr-1" size={16} /> Confirm Arrival
                      </button>
                      <button onClick={() => setBreakdownForm({ ...breakdownForm, open: true })} className="btn border-2 border-red-400 text-red-600 hover:bg-red-50 py-3">
                        <AlertTriangle className="inline mr-1" size={16} /> Report Breakdown
                      </button>
                    </>
                  )}
                  {activeJourney.status === 'arrived' && (
                    <button onClick={() => handleAction(activeJourney.id, 'complete')} className="col-span-2 btn bg-green-600 hover:bg-green-700 text-white py-3 font-bold">
                      <CheckCircle className="inline mr-2" size={18} /> End Journey &amp; Receive Payment
                    </button>
                  )}
                  {activeJourney.status === 'breakdown' && (
                    <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700 font-bold">
                      🚨 Emergency alert sent to Admin and Outlet. Awaiting instructions.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Journey History */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-base font-bold text-gray-800 mb-3">Journey History</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {journeys.filter(j => j.status === 'completed').length === 0 ? (
                <p className="text-xs text-gray-400">No completed journeys yet.</p>
              ) : journeys.filter(j => j.status === 'completed').map(j => (
                <div key={j.id} className="p-3 border border-gray-100 rounded-lg">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-semibold text-gray-800">{j.from_location} → {j.to_location}</p>
                    <span className="text-xs text-green-600 font-bold">LKR {parseFloat(j.payment_amount).toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(j.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
          <ActivityLog endpoint="/transporter/activity-logs" />
        </div>
      </div>

      {/* Breakdown Form Modal */}
      {breakdownForm.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-red-700 mb-4">🚨 Report Breakdown</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Breakdown Description</label>
                <textarea className="w-full border border-gray-300 rounded-md p-2 text-sm" rows={3}
                  value={breakdownForm.description}
                  onChange={e => setBreakdownForm({...breakdownForm, description: e.target.value})}
                  placeholder="Describe the issue..." />
              </div>
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700">
                <MapPin className="inline mr-1" size={14} />
                GPS Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)} (auto-captured)
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Repair Time</label>
                <input type="text" className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  value={breakdownForm.estimated_repair_time}
                  onChange={e => setBreakdownForm({...breakdownForm, estimated_repair_time: e.target.value})}
                  placeholder="e.g. 2 hours" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleBreakdown} className="flex-1 btn bg-red-600 hover:bg-red-700 text-white">Send Emergency Alert</button>
                <button onClick={() => setBreakdownForm({open: false, description: '', estimated_repair_time: ''})} className="btn border border-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransporterDashboard;
