import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../../context/AuthContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const factoryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});
const outletIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});
const truckIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

const OutletMap = () => {
  const { user } = useAuth();

  // Kurunegala factory
  const factoryPosition = [7.4863, 80.3647];
  // Simulated outlet position (Colombo)
  const outletPosition = [6.9271, 79.8612];
  // Simulated truck en route
  const [truckPos] = useState([7.1, 80.1]);

  const mapCenter = [
    (factoryPosition[0] + outletPosition[0]) / 2,
    (factoryPosition[1] + outletPosition[1]) / 2
  ];

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer center={mapCenter} zoom={8} style={{ height: '100%', width: '100%', borderRadius: 'var(--radius)' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={factoryPosition} icon={factoryIcon}>
          <Popup><strong>Nestlé Kurunegala Factory</strong><br/>Origin of shipment</Popup>
        </Marker>

        <Marker position={outletPosition} icon={outletIcon}>
          <Popup><strong>Your Outlet</strong><br/>{user?.district}</Popup>
        </Marker>

        <Marker position={truckPos} icon={truckIcon}>
          <Popup>
            <strong>Driver: Kamal Perera</strong><br/>
            Vehicle: WP CAB-4521<br/>
            ETA: ~35 mins
          </Popup>
        </Marker>

        <Polyline positions={[factoryPosition, truckPos, outletPosition]} color="var(--info)" dashArray="6, 10" />
      </MapContainer>

      {/* ETA Panel */}
      <div style={{
        position: 'absolute', bottom: '20px', left: '20px', width: '260px',
        backgroundColor: 'var(--card-bg)', padding: '18px', borderRadius: 'var(--radius)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.15)', zIndex: 1000
      }}>
        <h4 className="mb-2">Incoming Delivery</h4>
        <div className="flex justify-between mb-1"><span className="text-muted">Driver:</span><span>Kamal Perera</span></div>
        <div className="flex justify-between mb-1"><span className="text-muted">Vehicle:</span><span>WP CAB-4521</span></div>
        <div className="flex justify-between mb-3"><span className="text-muted">ETA:</span><span style={{ fontWeight: 600, color: 'var(--info)' }}>~35 mins</span></div>
        <div className="text-muted" style={{ fontSize: '0.8rem' }}>Auto-refreshing every 30s</div>
      </div>
    </div>
  );
};

export default OutletMap;
