import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Leaf, Clock, Package, DollarSign, MapPin, Activity } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

import MarketDemandBoard from '../../components/farmer/MarketDemandBoard';
import MyBidsList from '../../components/farmer/MyBidsList';
import FarmStock from '../../components/farmer/FarmStock';
import FarmerMap from '../../components/farmer/FarmerMap';
import FarmerPayments from '../../components/farmer/FarmerPayments';

const FarmerDashboard = () => {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('home');
  const [stats, setStats] = useState({ activeBids: 0, awaitingPayments: 0, completedDeliveries: 0, newMessages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    if (socket) {
      socket.on('farmer:payment_released', (data) => {
        toast.success(data.message || `Payment credited to your account by Nestlé Lanka Factory!`, {
          duration: 6000,
          icon: '💰'
        });
        fetchStats();
      });

      socket.on('notification', (data) => {
        if (data.type === 'Bid Status') {
          fetchStats();
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('farmer:payment_released');
        socket.off('notification');
      }
    };
  }, [socket]);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/farmer/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
          <button className="btn btn-outline">Open Chat</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="card flex items-center gap-3">
          <div style={{ padding: '15px', backgroundColor: 'rgba(0,90,156,0.1)', borderRadius: '50%', color: 'var(--info)' }}>
            <Leaf size={24} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Active Bids</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.activeBids}</div>
          </div>
        </div>
        
        <div className="card flex items-center gap-3">
          <div style={{ padding: '15px', backgroundColor: 'rgba(237,108,2,0.1)', borderRadius: '50%', color: 'var(--warning)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Awaiting Payments</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{formatCurrency(stats.awaitingPayments)}</div>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div style={{ padding: '15px', backgroundColor: 'rgba(46,125,50,0.1)', borderRadius: '50%', color: 'var(--success)' }}>
            <Package size={24} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Completed Deliveries</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.completedDeliveries}</div>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div style={{ padding: '15px', backgroundColor: 'rgba(204,0,0,0.1)', borderRadius: '50%', color: 'var(--primary)' }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>New Messages</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.newMessages}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs mb-4" style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')} style={{ padding: '8px 16px', background: activeTab === 'home' ? 'var(--primary)' : 'transparent', color: activeTab === 'home' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Home Overview
        </button>
        <button className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')} style={{ padding: '8px 16px', background: activeTab === 'market' ? 'var(--primary)' : 'transparent', color: activeTab === 'market' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Market Demand
        </button>
        <button className={`tab-btn ${activeTab === 'bids' ? 'active' : ''}`} onClick={() => setActiveTab('bids')} style={{ padding: '8px 16px', background: activeTab === 'bids' ? 'var(--primary)' : 'transparent', color: activeTab === 'bids' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          My Bids & Offers
        </button>
        <button className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')} style={{ padding: '8px 16px', background: activeTab === 'map' ? 'var(--primary)' : 'transparent', color: activeTab === 'map' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Live Delivery
        </button>
        <button className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')} style={{ padding: '8px 16px', background: activeTab === 'stock' ? 'var(--primary)' : 'transparent', color: activeTab === 'stock' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Farm Stock
        </button>
        <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')} style={{ padding: '8px 16px', background: activeTab === 'payments' ? 'var(--primary)' : 'transparent', color: activeTab === 'payments' ? 'white' : 'var(--text-main)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Payments
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'home' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <h3 className="mb-2">How to supply to Nestlé</h3>
              <p className="text-muted mt-2">
                1. Check the <strong>Market Demand</strong> tab for open requests from the Factory.<br/>
                2. Submit a Bid stating your price and available quantity.<br/>
                3. You can also offer your harvest directly via the <strong>My Bids & Offers</strong> tab.<br/>
                4. Once accepted, arrange transport and track it on the <strong>Live Delivery</strong> map.<br/>
                5. Get paid instantly into your registered bank account!
              </p>
            </div>
            <div className="card">
              <h3 className="mb-2">Historical Sales Analytics</h3>
              <p className="text-muted">Analytics chart will be loaded here.</p>
            </div>
          </div>
        )}

        {activeTab === 'market' && <MarketDemandBoard />}
        {activeTab === 'bids' && <MyBidsList />}
        {activeTab === 'map' && <div className="card" style={{ height: '600px', padding: '10px' }}><FarmerMap /></div>}
        {activeTab === 'stock' && <FarmStock />}
        {activeTab === 'payments' && <FarmerPayments />}
      </div>
    </div>
  );
};

export default FarmerDashboard;
