import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useAuth } from '../../context/AuthContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default leaflet icons not showing in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TruckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2766/2766020.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const DistributorMap = () => {
  const { token } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default Colombo center
  const center = [6.9271, 79.8612];

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/distributor/deliveries', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Include Accepted, In Transit, Delivered that have coordinates
        setDeliveries(data.filter(d => d.currentLat && d.currentLng || (d.Recipient?.lat && d.Recipient?.lng)));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Extract coordinates for Polyline
  const routePositions = deliveries
    .filter(d => d.status === 'Accepted' || d.status === 'In Transit')
    .map(d => {
      // If currently in transit, use current location, otherwise use recipient location
      if (d.status === 'In Transit' && d.currentLat) {
        return [Number(d.currentLat), Number(d.currentLng)];
      }
      if (d.Recipient?.lat) {
        return [Number(d.Recipient.lat), Number(d.Recipient.lng)];
      }
      return null;
    })
    .filter(pos => pos !== null);

  // Add Warehouse (center) as start of route
  if (routePositions.length > 0) {
    routePositions.unshift(center);
  }

  // Simulation: Move trucks randomly every 3 seconds to demonstrate live tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setDeliveries(prev => prev.map(d => {
        if (d.status === 'In Transit') {
          const latDiff = (Math.random() - 0.5) * 0.01;
          const lngDiff = (Math.random() - 0.5) * 0.01;
          const newLat = Number(d.currentLat) + latDiff;
          const newLng = Number(d.currentLng) + lngDiff;
          
          // Send to backend
          fetch(`http://localhost:5000/api/distributor/deliveries/${d.id}/location`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ lat: newLat, lng: newLng })
          }).catch(console.error);

          return { ...d, currentLat: newLat, currentLng: newLng };
        }
        return d;
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [token]);

  return (
    <div style={{ height: 'calc(100vh - 120px)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2>Live Route Tracking</h2>
        <div className="badge badge-warning">Simulating Movement</div>
      </div>
      
      <div className="card" style={{ height: '100%', padding: 0, overflow: 'hidden' }}>
        {loading ? <p style={{ padding: '20px' }}>Loading map...</p> : (
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {routePositions.length > 1 && (
              <Polyline 
                positions={routePositions} 
                color="var(--primary)" 
                weight={4} 
                dashArray="10, 10" 
                opacity={0.7} 
              />
            )}
            
            {/* Warehouse Marker */}
            <Marker position={center}>
              <Popup><strong>Your Warehouse</strong></Popup>
            </Marker>

            {deliveries.map((d, index) => {
              const pos = (d.status === 'In Transit' && d.currentLat) 
                ? [Number(d.currentLat), Number(d.currentLng)] 
                : (d.Recipient?.lat ? [Number(d.Recipient.lat), Number(d.Recipient.lng)] : null);
                
              if (!pos) return null;

              return (
                <Marker 
                  key={d.id} 
                  position={pos}
                  icon={d.status === 'In Transit' ? TruckIcon : new L.Icon.Default()}
                >
                  <Popup>
                    <strong>Stop {index + 1}: {d.orderNumber}</strong><br/>
                    Status: {d.status}<br/>
                    To: {d.Recipient?.name}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default DistributorMap;
