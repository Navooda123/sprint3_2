import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons as requested in PRD
const factoryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const distributorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const LiveTrackingMap = () => {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [activeDeliveries, setActiveDeliveries] = useState([]);

  // Kurunegala Factory coordinates
  const factoryPosition = [7.4863, 80.3647]; 
  const sriLankaCenter = [7.8731, 80.7718];

  useEffect(() => {
    fetchActiveDeliveries();

    if (socket) {
      socket.on('delivery_update', (data) => {
        setActiveDeliveries(prev => 
          prev.map(delivery => 
            delivery.id === data.orderId 
              ? { ...delivery, currentLat: data.lat, currentLng: data.lng } 
              : delivery
          )
        );
      });
    }

    return () => {
      if (socket) socket.off('delivery_update');
    };
  }, [socket]);

  const fetchActiveDeliveries = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/factory/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const orders = await res.json();
        // Only get active ones that have coordinates
        const active = orders.filter(o => (o.status === 'Dispatched' || o.status === 'In Transit') && o.currentLat && o.currentLng);
        setActiveDeliveries(active);
      }
    } catch (error) {
      console.error('Error fetching map data:', error);
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      <MapContainer center={sriLankaCenter} zoom={8} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Factory Marker */}
        <Marker position={factoryPosition} icon={factoryIcon}>
          <Popup>
            <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Nestlé Lanka Factory</div>
            <div>Kurunegala, Sri Lanka</div>
          </Popup>
        </Marker>

        {/* Active Deliveries */}
        {activeDeliveries.map(delivery => {
          const pos = [delivery.currentLat, delivery.currentLng];
          return (
            <div key={delivery.id}>
              <Marker position={pos} icon={distributorIcon}>
                <Popup>
                  <div style={{ fontWeight: 'bold' }}>Delivery: {delivery.orderNumber}</div>
                  <div>Distributor: {delivery.Distributor?.name}</div>
                  <div>Status: {delivery.status}</div>
                </Popup>
              </Marker>
              <Polyline positions={[factoryPosition, pos]} color="var(--warning)" dashArray="5, 10" />
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default LiveTrackingMap;
