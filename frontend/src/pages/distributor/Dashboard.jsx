import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { MessageSquare, Bell, Package, Truck, AlertTriangle, CheckCircle, Navigation, Lock, ShieldOff } from 'lucide-react';
import Chat from '../../components/Chat';

import DistributorTasks from '../../components/distributor/DistributorTasks';
import DistributorAlerts from '../../components/distributor/DistributorAlerts';
import DistributorPerformance from '../../components/distributor/DistributorPerformance';
import DistributorOrder from '../../components/distributor/DistributorOrder';
import DistributorInvoices from '../../components/distributor/DistributorInvoices';
import RetailerPaymentsList from '../../components/distributor/RetailerPaymentsList';
import Map from './Map';

const DistributorDashboard = () => {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('tasks');
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState(null);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    fetchDeliveries();
    fetchContacts();
    fetchAccountStatus();

    if (socket) {
      socket.on('new_message', (msg) => {
        if (!isChatOpen || (activeContact?.id !== msg.senderId && activeContact?.id !== msg.recipientId)) {
          const contactId = msg.recipientId === 0 ? 0 : msg.senderId;
          if (contactId !== user.id) {
            setUnreadCounts(prev => ({ ...prev, [contactId]: (prev[contactId] || 0) + 1 }));
            toast.success(`New message from ${msg.senderName}`);
          }
        }
      });

      // Real-time account block event
      socket.on('distributor:blocked', (data) => {
        toast.error(data.message || 'Your account has been blocked due to overdue invoices.', { duration: 8000 });
        setAccountStatus(prev => prev ? { ...prev, account_status: 'blocked' } : { account_status: 'blocked' });
      });

      // Real-time unblock event
      socket.on('unblock:approved', (data) => {
        toast.success(data.message || 'Your account has been unblocked!', { duration: 6000 });
        setAccountStatus(prev => prev ? { ...prev, account_status: 'active' } : { account_status: 'active' });
      });

      // Unblock rejected
      socket.on('unblock:rejected', (data) => {
        toast.error(data.message || 'Your unblock request was rejected.', { duration: 6000 });
      });
    }

    return () => {
      if (socket) {
        socket.off('new_message');
        socket.off('distributor:blocked');
        socket.off('unblock:approved');
        socket.off('unblock:rejected');
      }
    };
  }, [socket, isChatOpen, activeContact, user?.id]);

  const fetchAccountStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/distributor/account-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAccountStatus(await res.json());
    } catch (error) {
      console.error('Failed to load account status');
    }
  };

  const fetchDeliveries = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/distributor/deliveries', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDeliveries(await res.json());
      }
    } catch (error) {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/messages/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setContacts(await res.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openContactChat = (contact) => {
    setActiveContact(contact);
    setUnreadCounts(prev => ({ ...prev, [contact.id]: 0 }));
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const kpis = {
    pending: deliveries.filter(d => d.status === 'Approved').length,
    active: deliveries.filter(d => d.status === 'Accepted' || d.status === 'In Transit').length,
    completed: deliveries.filter(d => d.status === 'Delivered').length
  };

  const isBlocked = accountStatus?.account_status === 'blocked';

  return (
    <div style={{ position: 'relative' }}>

      {/* ⚠️ ACCOUNT BLOCK BANNER — Must appear at top, non-dismissible */}
      {isBlocked && (
        <div style={{ 
          backgroundColor: 'var(--danger)', 
          color: 'white', 
          padding: '0',
          marginBottom: '20px',
          borderRadius: 'var(--radius)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <ShieldOff size={28} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>
                🔒 Your account is blocked. You cannot place new orders.
              </div>
              <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '10px' }}>
                You have one or more overdue invoices that must be settled before you can resume ordering. Go to the <strong>Invoices</strong> tab to pay your outstanding balance and request unblocking.
              </div>
              <div style={{ 
                backgroundColor: 'rgba(0,0,0,0.25)', 
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                padding: '12px 16px',
                fontSize: '0.9rem',
                fontWeight: 600
              }}>
                ⚖️ Legal Warning: Failure to settle overdue invoices within 3 days will result in legal proceedings by Nestlé Lanka (Pvt) Ltd.
              </div>
            </div>
          </div>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '10px 20px', fontSize: '0.85rem', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Lock size={14} />
            <span>New orders are locked until all overdue invoices are cleared and verified by Admin.</span>
            <button 
              className="btn" 
              style={{ backgroundColor: 'white', color: 'var(--danger)', border: 'none', padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600, marginLeft: 'auto' }}
              onClick={() => setActiveTab('invoices')}
            >
              Go to Invoices →
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div>
          <h2>Distributor Hub</h2>
          <p className="text-muted">Manage your deliveries, routes, and performance</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline flex items-center gap-2" style={{ position: 'relative' }} onClick={() => setIsChatOpen(!isChatOpen)}>
            <MessageSquare size={18} /> Communications
            {totalUnread > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {totalUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="card flex items-center gap-4 border-l-4" style={{ borderLeftColor: 'var(--warning)' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(237,108,2,0.1)', borderRadius: '50%', color: 'var(--warning)' }}>
            <Package size={24} />
          </div>
          <div>
            <div className="text-muted text-sm">Pending Deliveries</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{kpis.pending}</div>
          </div>
        </div>

        <div className="card flex items-center gap-4 border-l-4" style={{ borderLeftColor: 'var(--primary)' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(0,90,156,0.1)', borderRadius: '50%', color: 'var(--primary)' }}>
            <Truck size={24} />
          </div>
          <div>
            <div className="text-muted text-sm">Active in Transit</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{kpis.active}</div>
          </div>
        </div>

        <div className="card flex items-center gap-4 border-l-4" style={{ borderLeftColor: 'var(--success)' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(46,125,50,0.1)', borderRadius: '50%', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="text-muted text-sm">Completed Today</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{kpis.completed}</div>
          </div>
        </div>

        <div className="card flex items-center gap-4 border-l-4" style={{ borderLeftColor: isBlocked ? 'var(--danger)' : 'var(--success)' }}>
          <div style={{ padding: '12px', backgroundColor: isBlocked ? 'rgba(211,47,47,0.1)' : 'rgba(46,125,50,0.1)', borderRadius: '50%', color: isBlocked ? 'var(--danger)' : 'var(--success)' }}>
            {isBlocked ? <Lock size={24} /> : <CheckCircle size={24} />}
          </div>
          <div>
            <div className="text-muted text-sm">Account Status</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: isBlocked ? 'var(--danger)' : 'var(--success)' }}>
              {isBlocked ? 'Blocked' : 'Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-4" style={{ borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
        {['tasks', 'order', 'invoices', 'retailer-payments', 'map', 'alerts', 'performance'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '10px 20px', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap'
            }}
          >
            {tab === 'alerts' ? 'Stock Alerts' : 
             tab === 'map' ? 'Live Map' : 
             tab === 'performance' ? 'Performance' : 
             tab === 'retailer-payments' ? 'Retailer Payments' :
             tab === 'order' ? (
               <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                 Order Stock {isBlocked && <Lock size={12} color="var(--danger)" />}
               </span>
             ) :
             tab === 'invoices' ? 'My Invoices' : 'Delivery Tasks'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '500px' }}>
        {loading ? <p>Loading...</p> : (
          <>
            {activeTab === 'tasks' && <DistributorTasks deliveries={deliveries} refreshDeliveries={fetchDeliveries} token={token} isBlocked={isBlocked} />}
            {activeTab === 'order' && <DistributorOrder />}
            {activeTab === 'invoices' && <DistributorInvoices />}
            {activeTab === 'retailer-payments' && <RetailerPaymentsList />}
            {activeTab === 'map' && <Map />}
            {activeTab === 'alerts' && <DistributorAlerts />}
            {activeTab === 'performance' && <DistributorPerformance deliveries={deliveries} />}
          </>
        )}
      </div>

      {/* Chat Modal */}
      {isChatOpen && (
        <div className="card" style={{ position: 'fixed', bottom: '20px', right: '20px', width: '700px', height: '500px', zIndex: 1000, display: 'flex', padding: 0, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          
          <div style={{ width: '250px', backgroundColor: 'var(--bg-color)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '15px', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Contacts</h3>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {contacts.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => openContactChat(c)}
                  style={{ 
                    padding: '12px 15px', 
                    borderBottom: '1px solid var(--border-color)', 
                    cursor: 'pointer',
                    backgroundColor: activeContact?.id === c.id ? 'rgba(0,90,156,0.1)' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: activeContact?.id === c.id ? 600 : 400 }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {c.role} {c.district ? `(${c.district})` : ''}
                    </div>
                  </div>
                  {unreadCounts[c.id] > 0 && (
                    <span className="badge" style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '2px 6px', fontSize: '0.7rem' }}>
                      {unreadCounts[c.id]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, backgroundColor: 'white' }}>
            {activeContact ? (
              <Chat recipientId={activeContact.id} recipientName={activeContact.name} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Select a contact to start messaging
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DistributorDashboard;
