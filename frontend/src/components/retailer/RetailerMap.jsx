import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useAuth } from '../../context/AuthContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default leaflet icons
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

const ShopIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1261/1261163.png', // Shop icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const RetailerMap = () => {
  const { token, user } = useAuth();
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use user location if available, else Colombo
  const shopLocation = user?.lat && user?.lng ? [Number(user.lat), Number(user.lng)] : [6.9271, 79.8612];

  useEffect(() => {
    fetchOrders();
    
    // Auto-refresh every 30 seconds for live tracking
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter orders that have current coordinates (i.e. assigned to a distributor tracking them)
        setActiveOrders(data.filter(d => d.status === 'In Transit' || d.status === 'Dispatched' || d.status === 'Accepted'));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div className="flex items-center justify-between mb-3">
        <h3>Live Delivery Tracking</h3>
        <div className="badge badge-warning flex items-center gap-2">
          <span style={{ width: '8px', height: '8px', backgroundColor: 'currentColor', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
          Live ETA active
        </div>
      </div>
      
      <div style={{ height: 'calc(100% - 50px)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        {loading ? <p style={{ padding: '20px' }}>Loading map...</p> : (
          <MapContainer center={shopLocation} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
            
            {/* Shop Location */}
            <Marker position={shopLocation} icon={ShopIcon}>
              <Popup>
                <strong>{user?.name?.split(' (')[0] || 'Shop'}</strong><br/>
                Your Shop Location
              </Popup>
            </Marker>

            {/* Active Distributor Trucks */}
            {activeOrders.map(order => {
              if (!order.currentLat || !order.currentLng) return null;
              
              const truckPos = [Number(order.currentLat), Number(order.currentLng)];
              
              // Calculate simple rough distance for ETA simulation
              const latDiff = Math.abs(shopLocation[0] - truckPos[0]);
              const lngDiff = Math.abs(shopLocation[1] - truckPos[1]);
              const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough km
              const etaMins = Math.max(2, Math.round((dist / 40) * 60)); // Assuming 40km/h avg speed

              return (
                <React.Fragment key={order.id}>
                  <Marker position={truckPos} icon={TruckIcon}>
                    <Popup>
                      <strong>Order {order.orderNumber}</strong><br/>
                      Distributor: {order.Distributor?.name || 'Assigned'}<br/>
                      Status: {order.status}<br/>
                      <span style={{ color: 'var(--warning)', fontWeight: 600 }}>ETA: ~{etaMins} mins</span>
                    </Popup>
                  </Marker>
                  <Polyline 
                    positions={[truckPos, shopLocation]} 
                    color="var(--warning)" 
                    weight={4} 
                    dashArray="10, 10" 
                    opacity={0.6} 
                  />
                </React.Fragment>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default RetailerMap;
