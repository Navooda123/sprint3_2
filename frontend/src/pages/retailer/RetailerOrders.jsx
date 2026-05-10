import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { ShoppingBag, Truck, CheckCircle, Clock, MapPin, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2769/2769339.png',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

const storeIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1059/1059066.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const STATUS_STYLE = {
  pending:    'bg-yellow-100 text-yellow-700',
  dispatched: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-purple-100 text-purple-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-gray-100 text-gray-500',
};

const STATUS_ICON = {
  pending:    <Clock size={14} />,
  dispatched: <Truck size={14} />,
  in_transit: <Truck size={14} />,
  delivered:  <CheckCircle size={14} />,
};

// Haversine distance formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Component to auto-center map on truck
const AutoCenter = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom(), { animate: true });
  }, [position, map]);
  return null;
};

const RetailerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState({}); // { orderId: { journey, gps } }
  const socket = useSocket();

  // Simulated Retailer Store Location for map target
  const RETAILER_LOCATION = { lat: 6.9550, lng: 79.9100 };

  useEffect(() => {
    fetchOrders();
    if (socket) {
      socket.on('order:dispatched', () => { toast.success('Your order has been dispatched!'); fetchOrders(); });
      socket.on('gps_update', (data) => {
        setTracking(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(ordId => {
            if (updated[ordId]?.journey?.id) {
              updated[ordId] = { ...updated[ordId], gps: data };
            }
          });
          return updated;
        });
      });
    }
    return () => { if (socket) { socket.off('order:dispatched'); socket.off('gps_update'); } };
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/retailer/orders');
      setOrders(res.data);
    } catch (err) { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  const fetchTracking = async (orderId) => {
    try {
      const res = await axios.get(`/retailer/orders/${orderId}/tracking`);
      setTracking(prev => ({ ...prev, [orderId]: res.data }));
    } catch (e) {}
  };

  const toggleTracking = (orderId) => {
    if (tracking[orderId] !== undefined) {
      setTracking(prev => { const n = {...prev}; delete n[orderId]; return n; });
    } else {
      fetchTracking(orderId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-nestleBlue rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Order History</h2>
          <p className="text-blue-100 text-sm">Track your supply requests from the outlet</p>
        </div>
        <div className="bg-white/20 p-4 rounded-full">
          <ShoppingBag size={36} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-nestleBlue border-t-transparent"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <ShoppingBag className="mx-auto mb-3 opacity-30" size={40} />
          <p className="font-medium">No orders yet. Place your first order from the catalog.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const trackData = tracking[order.id];
            const hasTracking = ['dispatched', 'in_transit'].includes(order.status);

            let distKm = 0, speed = 0, etaMins = 0;
            if (trackData?.gps) {
              distKm = calculateDistance(parseFloat(trackData.gps.latitude), parseFloat(trackData.gps.longitude), RETAILER_LOCATION.lat, RETAILER_LOCATION.lng);
              speed = trackData.gps.speed || 30;
              etaMins = Math.round((distKm / speed) * 60);
            }

            return (
              <div key={order.id} className="card p-0 overflow-hidden">
                {/* Order Header */}
                <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${STATUS_STYLE[order.status] || 'bg-gray-100'}`}>
                      {STATUS_ICON[order.status] || <ShoppingBag size={14} />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Order #{order.id.substring(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-500'}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                    <span className="font-black text-xl text-nestleBlue">
                      LKR {parseFloat(order.total_amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Order Body */}
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${order.payment_type === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {order.payment_type === 'cash' ? '💵 Cash (10% off)' : '💳 Credit'}
                      </span>
                      {order.journey_status && (
                        <span className="text-xs text-gray-500">Journey: <strong className="text-gray-700 capitalize">{order.journey_status}</strong></span>
                      )}
                    </div>

                    {/* Live Tracking Toggle */}
                    {hasTracking && (
                      <button
                        onClick={() => toggleTracking(order.id)}
                        className={`flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-lg transition ${
                          trackData !== undefined
                            ? 'bg-nestleBlue text-white'
                            : 'border border-nestleBlue text-nestleBlue hover:bg-blue-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${trackData !== undefined ? 'bg-white animate-pulse' : 'bg-nestleBlue'}`}></span>
                        {trackData !== undefined ? 'Hide Tracking' : 'Track Delivery'}
                      </button>
                    )}
                  </div>

                  {/* Live GPS Tracking Panel with Map */}
                  {trackData !== undefined && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                      {trackData === null ? (
                        <p className="text-sm text-gray-500 text-center py-6">No live GPS data yet. Tracking starts when transporter departs.</p>
                      ) : (
                        <div className="flex flex-col lg:flex-row h-[400px]">
                          {/* Info Sidebar */}
                          <div className="w-full lg:w-72 bg-white p-5 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col justify-between shrink-0">
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nestleBlue opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-nestleBlue"></span>
                                </span>
                                <p className="text-sm font-bold text-gray-800">Live Delivery Update</p>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                  <p className="text-xs text-gray-500 mb-0.5">Transporter</p>
                                  <p className="font-bold text-gray-800 text-sm">{trackData.journey?.transporter_name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">Vehicle: <span className="font-bold text-gray-700">{trackData.journey?.vehicle_number}</span></p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1 flex items-center"><Navigation size={12} className="mr-1" /> Speed</p>
                                    <p className="font-black text-nestleBlue">{speed} <span className="text-xs font-normal">km/h</span></p>
                                  </div>
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1 flex items-center"><MapPin size={12} className="mr-1" /> Remaining</p>
                                    <p className="font-black text-gray-800">{distKm.toFixed(1)} <span className="text-xs font-normal">km</span></p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Estimated Arrival</p>
                              <div className="flex items-end gap-1">
                                <span className="text-3xl font-black text-green-600">{etaMins}</span>
                                <span className="text-sm font-bold text-green-700 mb-1">mins</span>
                              </div>
                            </div>
                          </div>

                          {/* Map Area */}
                          <div className="flex-1 bg-gray-200 relative z-0 h-full">
                            {trackData.gps ? (
                              <MapContainer 
                                center={[parseFloat(trackData.gps.latitude), parseFloat(trackData.gps.longitude)]} 
                                zoom={14} 
                                style={{ height: '100%', width: '100%' }}
                              >
                                <TileLayer
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />
                                <AutoCenter position={[parseFloat(trackData.gps.latitude), parseFloat(trackData.gps.longitude)]} />
                                
                                <Marker position={[parseFloat(trackData.gps.latitude), parseFloat(trackData.gps.longitude)]} icon={truckIcon}>
                                  <Popup>
                                    <strong>{trackData.journey?.transporter_name}</strong><br/>
                                    {speed} km/h
                                  </Popup>
                                </Marker>

                                <Marker position={[RETAILER_LOCATION.lat, RETAILER_LOCATION.lng]} icon={storeIcon}>
                                  <Popup>Your Store</Popup>
                                </Marker>
                              </MapContainer>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                                <p>Waiting for GPS signal...</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RetailerOrders;
