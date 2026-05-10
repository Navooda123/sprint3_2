import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useLanguage } from '../../context/LanguageContext';
import { Truck, MapPin, AlertTriangle, CheckCircle, Navigation, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  assigned:   'bg-blue-100 text-blue-700 border-blue-200',
  departed:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  in_transit: 'bg-purple-100 text-purple-700 border-purple-200',
  arrived:    'bg-green-100 text-green-700 border-green-200',
  completed:  'bg-gray-100 text-gray-600 border-gray-200',
  breakdown:  'bg-red-100 text-red-700 border-red-200',
};

const TransporterJourney = () => {
  const [journeys, setJourneys] = useState([]);
  const [activeJourney, setActiveJourney] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [location, setLocation] = useState({ lat: 6.9271, lng: 79.8612 });
  const [breakdownForm, setBreakdownForm] = useState({ open: false, description: '', estimated_repair_time: '' });
  const [loading, setLoading] = useState(true);
  const socket = useSocket();
  const { t } = useLanguage();

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

  // GPS simulation
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
      const [journeysRes, activeRes] = await Promise.all([
        axios.get('/transporter/journeys'),
        axios.get('/transporter/journeys/active'),
      ]);
      setJourneys(journeysRes.data);
      const active = activeRes.data;
      setActiveJourney(active);
      if (active && ['departed', 'in_transit'].includes(active.status)) setIsSimulating(true);
    } catch { toast.error('Failed to load journeys'); }
    finally { setLoading(false); }
  };

  const handleAction = async (id, action) => {
    try {
      await axios.put(`/transporter/journeys/${id}/${action}`);
      if (action === 'depart')   { toast.success('Journey started! GPS tracking enabled.'); setIsSimulating(true); }
      if (action === 'arrive')   { toast.success('Arrived at destination!'); setIsSimulating(false); }
      if (action === 'complete') { toast.success('Journey completed! Payment received.'); setIsSimulating(false); setActiveJourney(null); }
      fetchData();
    } catch { toast.error(`Failed to ${action}`); }
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
    } catch { toast.error('Failed to report breakdown'); }
  };

  const completedJourneys = journeys.filter(j => j.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-nestleBlue rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">{t('journey.title')}</h2>
          <p className="text-blue-100 text-sm">
            {activeJourney
              ? `${activeJourney.from_location} → ${activeJourney.to_location}`
              : t('journey.noJourney')}
          </p>
        </div>
        <div className={`p-4 rounded-full ${isSimulating ? 'bg-green-400/40 animate-pulse' : 'bg-white/20'}`}>
          <Truck size={36} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-nestleBlue border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Assignment */}
          <div className="lg:col-span-2 space-y-4">
            {!activeJourney ? (
              <div className="card text-center py-16 text-gray-400">
                <Truck className="mx-auto mb-4 text-gray-200" size={64} />
                <p className="font-bold text-lg">{t('journey.noJourney')}</p>
                <p className="text-sm mt-2">{t('journey.noJourneyDesc')}</p>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                {/* Route bar */}
                <div className="bg-nestleBlue/5 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('journey.route')}</p>
                    <p className="font-bold text-xl text-gray-800">
                      {activeJourney.from_location}
                      <span className="text-gray-400 mx-3">→</span>
                      {activeJourney.to_location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">{t('journey.payment')}</p>
                    <p className="font-black text-green-600 text-2xl">LKR {parseFloat(activeJourney.payment_amount).toLocaleString()}</p>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Status */}
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border capitalize ${STATUS_STYLE[activeJourney.status] || 'bg-gray-100 text-gray-600'}`}>
                      {activeJourney.status.replace('_', ' ')}
                    </span>
                    {isSimulating && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        {t('journey.gpsLive')}
                      </span>
                    )}
                  </div>

                  {/* GPS coordinates */}
                  {isSimulating && (
                    <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 font-medium grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-xs text-blue-500 mb-0.5">{t('journey.latitude')}</p>
                        <p className="font-black">{location.lat.toFixed(4)}°N</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-blue-500 mb-0.5">{t('journey.longitude')}</p>
                        <p className="font-black">{location.lng.toFixed(4)}°E</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-blue-500 mb-0.5">{t('journey.updating')}</p>
                        <p className="font-black">{t('journey.every5s')}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {activeJourney.status === 'assigned' && (
                      <button
                        onClick={() => handleAction(activeJourney.id, 'depart')}
                        className="col-span-2 btn bg-nestleBlue hover:bg-blue-700 text-white py-4 font-bold text-base flex items-center justify-center gap-2"
                      >
                        <Navigation size={20} /> {t('journey.startJourney')}
                      </button>
                    )}
                    {(activeJourney.status === 'departed' || activeJourney.status === 'in_transit') && (
                      <>
                        <button
                          onClick={() => handleAction(activeJourney.id, 'arrive')}
                          className="btn bg-green-500 hover:bg-green-600 text-white py-3 font-bold flex items-center justify-center gap-2"
                        >
                          <MapPin size={16} /> {t('journey.confirmArrival')}
                        </button>
                        <button
                          onClick={() => setBreakdownForm({ ...breakdownForm, open: true })}
                          className="btn border-2 border-red-400 text-red-600 hover:bg-red-50 py-3 font-bold flex items-center justify-center gap-2"
                        >
                          <AlertTriangle size={16} /> {t('journey.reportBreakdown')}
                        </button>
                      </>
                    )}
                    {activeJourney.status === 'arrived' && (
                      <button
                        onClick={() => handleAction(activeJourney.id, 'complete')}
                        className="col-span-2 btn bg-green-600 hover:bg-green-700 text-white py-4 font-bold text-base flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={20} /> {t('journey.endJourney')}
                      </button>
                    )}
                    {activeJourney.status === 'breakdown' && (
                      <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-700 font-bold">
                        🚨 {t('journey.emergencyAlert')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Journey History Sidebar */}
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-gray-400" /> {t('journey.journeyHistory')}
            </h3>
            {completedJourneys.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">{t('journey.noHistory')}</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {completedJourneys.map(j => (
                  <div key={j.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-gray-800">{j.from_location}</p>
                      <span className="text-xs text-green-600 font-black">LKR {parseFloat(j.payment_amount).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-500">→ {j.to_location}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(j.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Breakdown Modal */}
      {breakdownForm.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-red-700 mb-4">🚨 {t('journey.breakdownTitle')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('journey.breakdownLabel')}</label>
                <textarea className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" rows={3}
                  value={breakdownForm.description}
                  onChange={e => setBreakdownForm({ ...breakdownForm, description: e.target.value })}
                  placeholder={t('journey.breakdownDesc')} />
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                <MapPin size={14} />
                GPS Location: {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E (auto-captured)
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('journey.repairTime')}</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                  value={breakdownForm.estimated_repair_time}
                  onChange={e => setBreakdownForm({ ...breakdownForm, estimated_repair_time: e.target.value })}
                  placeholder={t('journey.repairPlaceholder')} />
              </div>
              <div className="flex gap-3">
                <button onClick={handleBreakdown} className="flex-1 btn bg-red-600 hover:bg-red-700 text-white font-bold">{t('journey.sendAlert')}</button>
                <button onClick={() => setBreakdownForm({ open: false, description: '', estimated_repair_time: '' })} className="btn border border-gray-300">{t('common.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransporterJourney;
