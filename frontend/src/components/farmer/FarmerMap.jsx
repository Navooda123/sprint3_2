import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const factoryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const farmIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const transportIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const FarmerMap = () => {
  const { user } = useAuth();
  
  // Factory coordinates
  const factoryPosition = [7.4863, 80.3647]; 
  
  // Simulated Farm coordinates (e.g., somewhere in North Western Province or user district)
  // We'll mock it slightly north of factory for simulation
  const farmPosition = [7.8, 80.4];

  // Simulated active delivery in transit
  const [deliveryPos, setDeliveryPos] = useState([7.6, 80.38]);
  const [delivered, setDelivered] = useState(false);

  const handleDelivered = () => {
    toast.success('Delivery confirmed! Factory notified.');
    setDelivered(true);
    setDeliveryPos(factoryPosition); // Snap to factory
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer center={[7.65, 80.38]} zoom={9} style={{ height: '100%', width: '100%', borderRadius: 'var(--radius)', zIndex: 0 }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        <Marker position={factoryPosition} icon={factoryIcon}>
          <Popup><strong>Nestlé Kurunegala Factory</strong></Popup>
        </Marker>

        <Marker position={farmPosition} icon={farmIcon}>
          <Popup><strong>Your Farm</strong><br/>{user?.district}</Popup>
        </Marker>

        {!delivered && (
          <Marker position={deliveryPos} icon={transportIcon}>
            <Popup>Transport Vehicle<br/>In Transit</Popup>
          </Marker>
        )}

        <Polyline positions={[farmPosition, factoryPosition]} color="var(--info)" dashArray="5, 10" />
      </MapContainer>

      {/* Floating Status Panel */}
      <div style={{ 
        position: 'absolute', top: '20px', right: '20px', width: '300px', 
        backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius)', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)', zIndex: 1000 
      }}>
        <h4 className="mb-2">Active Delivery</h4>
        {delivered ? (
          <div className="text-center text-success mb-2" style={{ fontWeight: 600 }}>Successfully Delivered</div>
        ) : (
          <>
            <div className="flex justify-between mb-2">
              <span className="text-muted" style={{ fontSize: '0.9rem' }}>Status:</span>
              <span className="badge" style={{ backgroundColor: 'var(--info)' }}>In Transit</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-muted" style={{ fontSize: '0.9rem' }}>ETA:</span>
              <span style={{ fontWeight: 500 }}>45 mins</span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-muted" style={{ fontSize: '0.9rem' }}>Material:</span>
              <span style={{ fontWeight: 500 }}>Fresh cow milk</span>
            </div>
            <button className="btn btn-primary w-full" onClick={handleDelivered}>Mark as Delivered</button>
          </>
        )}
      </div>
    </div>
  );
};

export default FarmerMap;
