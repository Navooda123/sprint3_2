import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { AlertTriangle, Clock, Truck, MessageCircle } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

import RetailerStock from '../../components/retailer/RetailerStock';
import RetailerOrders from '../../components/retailer/RetailerOrders';
import RetailerMap from '../../components/retailer/RetailerMap';
import RetailerHistory from '../../components/retailer/RetailerHistory';
import Chat from '../../components/Chat';

const RetailerDashboard = () => {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('stock');
  const [stats, setStats] = useState({ lowStock: 0, activeDeliveries: 0, pendingPayments: 0, newMessages: 0 });
  const [stockHistory, setStockHistory] = useState([]);
  
  // Chat State
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatContacts, setChatContacts] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchContacts();
    
    if (socket) {
      socket.on('new_message', (msg) => {
        if (user && msg.senderId !== user.id && (!showChatModal || selectedChat?.id !== msg.senderId)) {
          setStats(prev => ({ ...prev, newMessages: prev.newMessages + 1 }));
          toast(`New message from ${msg.senderName}`, { icon: '💬' });
        }
      });
    }
    return () => {
      if (socket) socket.off('new_message');
    }
  }, [socket, showChatModal, selectedChat, user]);

  const fetchContacts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/messages/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setChatContacts(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const invRes = await fetch('http://localhost:5000/api/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ordRes = await fetch('http://localhost:5000/api/inventory/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (invRes.ok && ordRes.ok) {
        const inventory = await invRes.json();
        const orders = await ordRes.json();

        const lowStockCount = inventory.filter(i => i.quantity <= (i.product?.stockThreshold || 25)).length;
        const activeCount = orders.filter(o => o.status === 'Dispatched' || o.status === 'In Transit').length;
        
        // Summing total amount for Pending payments (or we can just show a 0 for now as simulation)
        const pendingAmount = 0; 

        setStats(prev => ({ ...prev, lowStock: lowStockCount, activeDeliveries: activeCount, pendingPayments: pendingAmount }));
      }
    } catch (error) {
      console.error('Error fetching retailer stats:', error);
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="page-title">{getTimeGreeting()}, {user?.name?.split(' (')[0] || 'User'}</h2>
          <p className="text-muted">{formatDateTime(new Date().toISOString())}</p>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn btn-outline flex items-center gap-2" 
            onClick={() => { setShowChatModal(true); setStats(prev => ({ ...prev, newMessages: 0 })); }}
          >
            <MessageCircle size={18} /> Communications
            {stats.newMessages > 0 && <span className="badge" style={{ backgroundColor: 'var(--danger)', marginLeft: '5px' }}>{stats.newMessages}</span>}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="card flex items-center gap-3">
          <div style={{ padding: '15px', backgroundColor: 'rgba(211,47,47,0.1)', borderRadius: '50%', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Products &le; 25%</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.lowStock}</div>
          </div>
        </div>
        
        <div className="card flex items-center gap-3">
          <div style={{ padding: '15px', backgroundColor: 'rgba(0,90,156,0.1)', borderRadius: '50%', color: 'var(--info)' }}>
            <Truck size={24} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Orders In Transit</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.activeDeliveries}</div>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div style={{ padding: '15px', backgroundColor: 'rgba(237,108,2,0.1)', borderRadius: '50%', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Pending Payments</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>Rs. {stats.pendingPayments}</div>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div style={{ padding: '15px', backgroundColor: 'rgba(46,125,50,0.1)', borderRadius: '50%', color: 'var(--success)' }}>
            <MessageCircle size={24} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>New Messages</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.newMessages}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs mb-4" style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        {['stock', 'reorders', 'map', 'history'].map(tab => (
          <button 
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`} 
            onClick={() => setActiveTab(tab)} 
            style={{ 
              padding: '8px 16px', 
              background: activeTab === tab ? 'var(--primary)' : 'transparent', 
              color: activeTab === tab ? 'white' : 'var(--text-main)', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontWeight: 600,
              textTransform: 'capitalize'
            }}
          >
            {tab === 'reorders' ? 'Reorder Tracker' : tab === 'map' ? 'Live Delivery Tracking' : tab === 'stock' ? 'Stock Management' : 'Stock History'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content" style={{ minHeight: '500px' }}>
        {activeTab === 'stock' && <RetailerStock refreshStats={fetchStats} stockHistory={stockHistory} setStockHistory={setStockHistory} />}
        {activeTab === 'reorders' && <RetailerOrders refreshStats={fetchStats} stockHistory={stockHistory} setStockHistory={setStockHistory} />}
        {activeTab === 'map' && <div className="card" style={{ height: '600px', padding: '10px' }}><RetailerMap /></div>}
        {activeTab === 'history' && <RetailerHistory history={stockHistory} />}
      </div>

      {/* Chat Modal */}
      {showChatModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card flex" style={{ width: '800px', height: '600px', padding: 0, overflow: 'hidden' }}>
            <div style={{ width: '250px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>Contacts</div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {chatContacts.map(contact => (
                  <div 
                    key={contact.id} 
                    onClick={() => setSelectedChat(contact)}
                    style={{ 
                      padding: '15px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                      backgroundColor: selectedChat?.id === contact.id ? 'var(--bg-color)' : 'transparent',
                      fontWeight: selectedChat?.id === contact.id ? 600 : 400
                    }}
                  >
                    {contact.name}
                    <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>{contact.role}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-outline" style={{ margin: '15px' }} onClick={() => { setShowChatModal(false); setSelectedChat(null); }}>Close Chat</button>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)' }}>
              {selectedChat ? (
                <Chat recipientId={selectedChat.id} recipientName={selectedChat.name} />
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Select a contact to start messaging
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailerDashboard;
