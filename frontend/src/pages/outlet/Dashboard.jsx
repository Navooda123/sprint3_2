import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { AlertTriangle, Clock, Truck, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../utils/formatters';

import OutletStock from '../../components/outlet/OutletStock';
import OutletReorders from '../../components/outlet/OutletReorders';
import OutletMap from '../../components/outlet/OutletMap';
import OutletHistory from '../../components/outlet/OutletHistory';
import OutletPayments from '../../components/outlet/OutletPayments';
import OutletInvoiceTracker from '../../components/outlet/OutletInvoiceTracker';
import Chat from '../../components/Chat';

const OutletDashboard = () => {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('stock');
  const [stats, setStats] = useState({ lowStock: 0, pendingReorders: 0, activeDeliveries: 0, newMessages: 0 });
  const [stockHistory, setStockHistory] = useState([]);
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
      const invRes = await fetch('http://localhost:5000/api/outlet/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ordRes = await fetch('http://localhost:5000/api/outlet/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (invRes.ok && ordRes.ok) {
        const inventory = await invRes.json();
        const orders = await ordRes.json();

        // Assuming max capacity is 100 for all items in our simulation
        const lowStockCount = inventory.filter(i => i.quantity <= 25).length;
        const pendingCount = orders.filter(o => o.status === 'Pending' || o.status === 'Approved').length;
        const activeCount = orders.filter(o => o.status === 'Dispatched' || o.status === 'In Transit').length;

        setStats({ lowStock: lowStockCount, pendingReorders: pendingCount, activeDeliveries: activeCount, newMessages: 0 });
      }
    } catch (error) {
      console.error('Error fetching outlet stats:', error);
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
          <h2 className="page-title">{getTimeGreeting()}, {user?.name}</h2>
          <p className="text-muted">{formatDateTime(new Date().toISOString())}</p>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn btn-outline flex items-center gap-2" 
            onClick={() => { setShowChatModal(true); setStats(prev => ({ ...prev, newMessages: 0 })); }}
          >
            <MessageCircle size={18} /> Open Chat
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
          <div style={{ padding: '15px', backgroundColor: 'rgba(237,108,2,0.1)', borderRadius: '50%', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Pending Reorders</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.pendingReorders}</div>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div style={{ padding: '15px', backgroundColor: 'rgba(0,90,156,0.1)', borderRadius: '50%', color: 'var(--info)' }}>
            <Truck size={24} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Upcoming Deliveries</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.activeDeliveries}</div>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div style={{ padding: '15px', backgroundColor: 'rgba(46,125,50,0.1)', borderRadius: '50%', color: 'var(--success)' }}>
            <MessageCircle size={24} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Unread Messages</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.newMessages}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs mb-4" style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')} style={{ padding: '8px 16px', background: activeTab === 'stock' ? 'var(--primary)' : 'transparent', color: activeTab === 'stock' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Stock Management
        </button>
        <button className={`tab-btn ${activeTab === 'reorders' ? 'active' : ''}`} onClick={() => setActiveTab('reorders')} style={{ padding: '8px 16px', background: activeTab === 'reorders' ? 'var(--primary)' : 'transparent', color: activeTab === 'reorders' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Reorder Tracker
        </button>
        <button className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')} style={{ padding: '8px 16px', background: activeTab === 'map' ? 'var(--primary)' : 'transparent', color: activeTab === 'map' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Shipment Map
        </button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')} style={{ padding: '8px 16px', background: activeTab === 'history' ? 'var(--primary)' : 'transparent', color: activeTab === 'history' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Stock History
        </button>
        <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')} style={{ padding: '8px 16px', background: activeTab === 'payments' ? 'var(--primary)' : 'transparent', color: activeTab === 'payments' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Payments
        </button>
        <button className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')} style={{ padding: '8px 16px', background: activeTab === 'invoices' ? 'var(--primary)' : 'transparent', color: activeTab === 'invoices' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Distributor Invoices
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'stock' && <OutletStock refreshStats={fetchStats} stockHistory={stockHistory} setStockHistory={setStockHistory} />}
        {activeTab === 'reorders' && <OutletReorders refreshStats={fetchStats} />}
        {activeTab === 'map' && <div className="card" style={{ height: '600px', padding: '10px' }}><OutletMap /></div>}
        {activeTab === 'history' && <OutletHistory history={stockHistory} />}
        {activeTab === 'payments' && <OutletPayments />}
        {activeTab === 'invoices' && <OutletInvoiceTracker />}
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

export default OutletDashboard;
