import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const rawMaterialsList = [
  'Fresh cow milk', 'Coconut', 'Cocoa beans', 'Sugar cane', 
  'Rice flour', 'Maize / corn', 'Cardamom', 'Cinnamon', 
  'Tea leaves', 'Soya'
];

const MyBidsList = () => {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSpontaneous, setShowSpontaneous] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [spontaneousForm, setSpontaneousForm] = useState({
    productType: '', quantity: '', pricePerUnit: '', availabilityDate: '', qualityNotes: ''
  });

  useEffect(() => {
    fetchBids();

    if (socket) {
      socket.on('farmer:payment_released', () => {
        fetchBids(); // Refresh bids to show updated status
      });
    }

    return () => {
      if (socket) socket.off('farmer:payment_released');
    };
  }, [socket]);

  const fetchBids = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/farmer/bids', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setBids(await res.json());
    } catch (error) {
      toast.error('Failed to fetch bids');
    } finally {
      setLoading(false);
    }
  };

  const handleSpontaneousChange = (e) => {
    setSpontaneousForm({ ...spontaneousForm, [e.target.name]: e.target.value });
  };

  const submitSpontaneousBid = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/farmer/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(spontaneousForm)
      });

      if (res.ok) {
        toast.success('Spontaneous offer submitted successfully!');
        setShowSpontaneous(false);
        setSpontaneousForm({ productType: '', quantity: '', pricePerUnit: '', availabilityDate: '', qualityNotes: '' });
        fetchBids();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to submit offer');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const notifyReadyForPickup = (bidId) => {
    toast.success('Factory notified! A transport vehicle will be scheduled.');
    // In a real app, this would update the order/bid status via API and emit a socket event
    if (socket) {
      socket.emit('farmer_ready', { bidId, farmerName: user.name });
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Pending': return <span className="badge" style={{ backgroundColor: 'var(--warning)' }}>Pending Review</span>;
      case 'Accepted': return <span className="badge" style={{ backgroundColor: 'var(--success)' }}>Accepted</span>;
      case 'Rejected': return <span className="badge" style={{ backgroundColor: 'var(--danger)' }}>Rejected</span>;
      case 'Delivered & Paid': return (
        <span className="badge" style={{ backgroundColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          💰 Delivered &amp; Paid
        </span>
      );
      case 'Dispatched': return <span className="badge" style={{ backgroundColor: 'var(--primary)' }}>Dispatched</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  if (loading) return <p>Loading your bids...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>My Bids & Offers</h3>
        <button className="btn btn-primary" onClick={() => setShowSpontaneous(!showSpontaneous)}>
          {showSpontaneous ? 'Cancel' : '+ Spontaneous Offer'}
        </button>
      </div>

      {showSpontaneous && (
        <div className="card mb-4" style={{ border: '2px solid var(--info)' }}>
          <h4 className="mb-2">Offer Your Harvest (Unsolicited)</h4>
          <p className="text-muted mb-3">Even if the factory hasn't requested it, you can offer your harvest. The factory will review your offer.</p>
          <form onSubmit={submitSpontaneousBid} className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">Material Name</label>
              <select className="form-control" name="productType" value={spontaneousForm.productType} onChange={handleSpontaneousChange} required>
                <option value="">Select Material</option>
                {rawMaterialsList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Total Quantity</label>
              <input type="number" className="form-control" name="quantity" value={spontaneousForm.quantity} onChange={handleSpontaneousChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Price per unit (Rs.)</label>
              <input type="number" className="form-control" name="pricePerUnit" value={spontaneousForm.pricePerUnit} onChange={handleSpontaneousChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Availability Date</label>
              <input type="date" className="form-control" name="availabilityDate" value={spontaneousForm.availabilityDate} onChange={handleSpontaneousChange} min={new Date().toISOString().split('T')[0]} required />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Quality Notes</label>
              <textarea className="form-control" name="qualityNotes" value={spontaneousForm.qualityNotes} onChange={handleSpontaneousChange} rows="2" required></textarea>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--info)' }}>Submit Offer</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {bids.length === 0 ? (
          <p className="text-center text-muted">You have not submitted any bids yet.</p>
        ) : (
          <table className="w-full text-left" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-2">Material</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Quantity</th>
                <th className="pb-2">My Price (Rs.)</th>
                <th className="pb-2">Delivery Date</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {bids.map(bid => (
                <React.Fragment key={bid.id}>
                  <tr 
                    style={{ borderTop: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: expandedId === bid.id ? 'var(--bg-color)' : 'transparent' }}
                    onClick={() => setExpandedId(expandedId === bid.id ? null : bid.id)}
                  >
                    <td className="py-3" style={{ fontWeight: 500 }}>{bid.productType || bid.request?.materialName}</td>
                    <td>{bid.requestId ? <span className="badge">Factory Request</span> : <span className="badge" style={{ backgroundColor: 'var(--info)' }}>Spontaneous</span>}</td>
                    <td>{bid.quantity}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(bid.pricePerUnit)}</td>
                    <td>{new Date(bid.availabilityDate).toLocaleDateString()}</td>
                    <td>{getStatusBadge(bid.status)}</td>
                  </tr>
                  
                  {expandedId === bid.id && (
                    <tr>
                      <td colSpan="6" style={{ padding: '0' }}>
                        <div style={{ padding: '15px', backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                          {bid.status === 'Accepted' && (
                            <div style={{ borderLeft: '4px solid var(--success)', paddingLeft: '15px' }}>
                              <h5 style={{ color: 'var(--success)' }}>Bid Accepted! Next Steps:</h5>
                              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0' }}>
                                <li><input type="checkbox" className="mr-2" /> Clean and pack material properly</li>
                                <li><input type="checkbox" className="mr-2" /> Label with Order #{bid.id}</li>
                                <li><input type="checkbox" className="mr-2" /> Arrange transport to Kurunegala factory</li>
                              </ul>
                              <div className="flex gap-3 mt-3">
                                <button className="btn btn-primary" onClick={() => notifyReadyForPickup(bid.id)}>Mark as Ready for Pickup</button>
                                <div className="text-muted" style={{ display: 'flex', alignItems: 'center' }}>Expected Payment: {formatCurrency(bid.quantity * bid.pricePerUnit)}</div>
                              </div>
                            </div>
                          )}
                          
                          {bid.status === 'Rejected' && (
                            <div style={{ borderLeft: '4px solid var(--danger)', paddingLeft: '15px' }}>
                              <h5 style={{ color: 'var(--danger)' }}>Bid Rejected</h5>
                              <p><strong>Factory Reason:</strong> {bid.reason || 'No specific reason provided. Price may have been too high or target quantity reached.'}</p>
                            </div>
                          )}

                          {bid.status === 'Pending' && (
                            <div style={{ borderLeft: '4px solid var(--warning)', paddingLeft: '15px' }}>
                              <h5 style={{ color: 'var(--warning)' }}>Bid Under Review</h5>
                              <p className="text-muted">The Factory Admin is currently reviewing your bid. You will be notified once a decision is made.</p>
                              {bid.requestId && <button className="btn btn-outline mt-2" style={{ fontSize: '0.8rem' }}>Edit Bid Details</button>}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MyBidsList;
