import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Chat from '../../components/Chat';

const FarmerMessages = () => {
  const { token } = useAuth();
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    // In this system, there's usually one factory admin
    fetch('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      // Find the admin user ID (for this demo, we assume ID 1 or fetch by role)
      // For simplicity, let's just chat with the main admin
      setAdmin({ id: 1, name: 'Factory Admin' }); 
    });
  }, [token]);

  if (!admin) return <div>Loading chat...</div>;

  return (
    <div>
      <h2 className="mb-3">Factory Messaging</h2>
      <Chat recipientId={admin.id} recipientName={admin.name} />
    </div>
  );
};

export default FarmerMessages;
