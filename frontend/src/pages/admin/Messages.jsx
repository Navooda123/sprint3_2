import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Chat from '../../components/Chat';

const AdminMessages = () => {
  const { token } = useAuth();
  const [farmers, setFarmers] = useState([]);
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  useEffect(() => {
    // Fetch all farmers to chat with
    fetch('http://localhost:5000/api/factory/bids', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      // Extract unique farmers from bids
      const uniqueFarmers = [];
      const map = new Map();
      for (const bid of data) {
        if (!map.has(bid.farmerId)) {
          map.set(bid.farmerId, true);
          uniqueFarmers.push(bid.farmer);
        }
      }
      setFarmers(uniqueFarmers);
      if (uniqueFarmers.length > 0) setSelectedFarmer(uniqueFarmers[0]);
    });
  }, [token]);

  return (
    <div>
      <h2 className="mb-3">Farmer Communications</h2>
      <div className="grid grid-cols-4 gap-3">
        <div className="card" style={{ padding: '10px' }}>
          <h4 className="mb-2">Active Farmers</h4>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {farmers.map(f => (
              <li 
                key={f.id} 
                onClick={() => setSelectedFarmer(f)}
                style={{ 
                  padding: '10px', 
                  borderRadius: 'var(--radius)', 
                  cursor: 'pointer',
                  backgroundColor: selectedFarmer?.id === f.id ? 'var(--primary)' : 'transparent',
                  color: selectedFarmer?.id === f.id ? 'white' : 'inherit'
                }}
              >
                {f.name}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="col-span-3" style={{ gridColumn: 'span 3' }}>
          {selectedFarmer ? (
            <Chat recipientId={selectedFarmer.id} recipientName={selectedFarmer.name} />
          ) : (
            <div className="card flex items-center justify-center" style={{ height: '500px' }}>
              <p className="text-muted">Select a farmer to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
