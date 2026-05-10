import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const FarmerBids = () => {
  const { token } = useAuth();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    productType: '', quantity: '', pricePerUnit: '', availabilityDate: '', certificateUrl: ''
  });

  useEffect(() => {
    fetchBids();
  }, []);

  const fetchBids = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/farmer/bids', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBids(data);
      }
    } catch (error) {
      toast.error('Failed to load bids');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/farmer/bids', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success('Bid submitted successfully');
        setShowModal(false);
        fetchBids();
        setFormData({ productType: '', quantity: '', pricePerUnit: '', availabilityDate: '', certificateUrl: '' });
      } else {
        toast.error('Failed to submit bid');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Accepted': return <span className="badge badge-success">Accepted</span>;
      case 'Rejected': return <span className="badge badge-danger">Rejected</span>;
      default: return <span className="badge badge-warning">Pending</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2>My Bids</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Bid</button>
      </div>

      <div className="card table-container">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Date Submitted</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price/Unit</th>
                <th>Total Value</th>
                 <th>Availability</th>
                <th>Status</th>
                <th>Cert.</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {bids.length === 0 ? (
                <tr><td colSpan="9" className="text-center text-muted">You haven't submitted any bids yet.</td></tr>
              ) : (
                bids.map(bid => (
                  <tr key={bid.id}>
                    <td>{new Date(bid.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500 }}>{bid.productType}</td>
                    <td>{bid.quantity}</td>
                    <td>${Number(bid.pricePerUnit).toFixed(2)}</td>
                    <td style={{ fontWeight: 600 }}>${(bid.quantity * Number(bid.pricePerUnit)).toFixed(2)}</td>
                    <td>{new Date(bid.availabilityDate).toLocaleDateString()}</td>
                    <td>{getStatusBadge(bid.status)}</td>
                    <td>
                      {bid.certificateUrl ? (
                        <a href={bid.certificateUrl} target="_blank" rel="noreferrer" className="text-primary" style={{ fontSize: '0.8rem' }}>View</a>
                      ) : '-'}
                    </td>
                    <td><span className="text-muted" style={{ fontSize: '0.9rem' }}>{bid.reason || '-'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-3">
              <h3>Submit New Bid</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Product Type (e.g. Milk, Cocoa)</label>
                <input type="text" className="form-control" required value={formData.productType} onChange={e => setFormData({...formData, productType: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity (kg/L)</label>
                <input type="number" className="form-control" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Price Per Unit ($)</label>
                <input type="number" step="0.01" className="form-control" required value={formData.pricePerUnit} onChange={e => setFormData({...formData, pricePerUnit: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Availability Date</label>
                <input type="date" className="form-control" required value={formData.availabilityDate} onChange={e => setFormData({...formData, availabilityDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Quality Certificate URL</label>
                <input type="url" className="form-control" placeholder="https://..." value={formData.certificateUrl} onChange={e => setFormData({...formData, certificateUrl: e.target.value})} />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit Bid</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerBids;
