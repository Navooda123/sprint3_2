import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck } from 'lucide-react';

// Fix Leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom truck icon
const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/713/713311.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const LiveMap = () => {
  const [transporters, setTransporters] = useState({});
  const socket = useSocket();

  useEffect(() => {
    fetchLiveTransporters();

    if (socket) {
      socket.on('gps_update', (data) => {
        setTransporters(prev => ({
          ...prev,
          [data.transporter_id]: {
            ...prev[data.transporter_id],
            lat: parseFloat(data.latitude),
            lng: parseFloat(data.longitude),
            speed: parseFloat(data.speed),
            lastUpdate: new Date()
          }
        }));
      });
      
      socket.on('departure_notify', () => fetchLiveTransporters());
      socket.on('arrival_notify', () => fetchLiveTransporters());
      socket.on('journey_completed', () => fetchLiveTransporters());
    }

    return () => {
      if (socket) {
        socket.off('gps_update');
        socket.off('departure_notify');
        socket.off('arrival_notify');
        socket.off('journey_completed');
      }
    };
  }, [socket]);

  const fetchLiveTransporters = async () => {
    try {
      const res = await axios.get('/admin/transporters/live');
      const tMap = {};
      res.data.forEach(t => {
        tMap[t.transporter_id] = {
          lat: parseFloat(t.latitude),
          lng: parseFloat(t.longitude),
          speed: parseFloat(t.speed),
          lastUpdate: new Date(t.logged_at)
        };
      });
      setTransporters(tMap);
    } catch (err) {
      console.error('Failed to load live transporters', err);
    }
  };

  const center = [7.8731, 80.7718]; // Center of Sri Lanka

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Live Transporter Tracking</h2>
          <p className="text-gray-500">Monitor active deliveries across Sri Lanka in real-time</p>
        </div>
        <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg font-bold flex items-center">
          <Truck className="mr-2" size={20} />
          {Object.keys(transporters).length} Active Trucks
        </div>
      </div>

      <div className="card flex-1 p-0 overflow-hidden relative border-4 border-white shadow-xl rounded-xl">
        <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          {Object.entries(transporters).map(([id, t]) => (
            <Marker key={id} position={[t.lat, t.lng]} icon={truckIcon}>
              <Popup>
                <div className="text-center">
                  <h4 className="font-bold text-nestleBlue mb-1">Transporter #{id.substring(0, 5)}</h4>
                  <p className="text-sm">Speed: <strong>{t.speed} km/h</strong></p>
                  <p className="text-xs text-gray-500 mt-1">Last Update: {t.lastUpdate.toLocaleTimeString()}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default LiveMap;
