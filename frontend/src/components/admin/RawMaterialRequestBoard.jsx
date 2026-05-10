import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { CheckCircle, DollarSign, X } from 'lucide-react';

const rawMaterialsList = [
  'Fresh cow milk', 'Coconut', 'Cocoa beans', 'Sugar cane', 
  'Rice flour', 'Maize / corn', 'Cardamom', 'Cinnamon', 
  'Tea leaves', 'Soya'
];

const RawMaterialRequestBoard = () => {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    materialName: '', quantityNeeded: '', unit: '', requiredByDate: '',
    qualitySpecs: '', minPrice: '', maxPrice: ''
  });
  const [expandedId, setExpandedId] = useState(null);

  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState(null); // { bid, request }
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/factory/raw-material-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (error) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUnitSelect = (e) => {
    const material = e.target.value;
    let unit = 'kg';
    if (material === 'Fresh cow milk') unit = 'liters';
    if (material === 'Coconut') unit = 'units';
    setFormData({ ...formData, materialName: material, unit });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(formData.maxPrice) <= parseFloat(formData.minPrice)) {
      return toast.error('Max price must be greater than min price');
    }
    
    try {
      const res = await fetch('http://localhost:5000/api/factory/raw-material-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success('Request posted successfully');
        setShowForm(false);
        setFormData({ materialName: '', quantityNeeded: '', unit: '', requiredByDate: '', qualitySpecs: '', minPrice: '', maxPrice: '' });
        fetchRequests();
      }
    } catch (error) {
      toast.error('Failed to post request');
    }
  };

  const handleBidAction = async (bidId, status) => {
    if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this bid?`)) return;
    
    try {
      const res = await fetch(`http://localhost:5000/api/factory/bids/${bidId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, reason: status === 'Rejected' ? 'Factory admin decision' : '' })
      });
      
      if (res.ok) {
        toast.success(`Bid ${status}`);
        fetchRequests();
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  // Tier 3: Admin clicks "Received" on a Farmer dispatch → opens payment modal
  const handleReceivedClick = (bid, request) => {
    setPaymentModal({ bid, request });
  };

  // Tier 3: Admin confirms payment → calls /factory/bids/:id/pay → farmer gets notified
  const handleConfirmPayment = async () => {
    if (!paymentModal) return;
    setPaying(true);
    try {
      const res = await fetch(`http://localhost:5000/api/factory/bids/${paymentModal.bid.id}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success(`Payment of Rs. ${(paymentModal.bid.quantity * paymentModal.bid.pricePerUnit).toFixed(2)} released to ${paymentModal.bid.farmer?.name}`);
        setPaymentModal(null);
        fetchRequests();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Payment failed');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div>Loading requests...</div>;

  const paymentAmount = paymentModal ? (paymentModal.bid.quantity * paymentModal.bid.pricePerUnit) : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>Raw Material Request Board</h3>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Post New Request'}
        </button>
      </div>

      {/* Payment Modal — Tier 3 Farmer Payment */}
      {paymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card" style={{ width: '480px', maxWidth: '90vw' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0, color: 'var(--success)' }}>
                <DollarSign size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                Release Payment to Farmer
              </h3>
              <button onClick={() => setPaymentModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px' }}>
              <div className="grid grid-cols-2 gap-3" style={{ fontSize: '0.9rem' }}>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Farmer</div>
                  <div style={{ fontWeight: 600 }}>{paymentModal.bid.farmer?.name}</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Material</div>
                  <div style={{ fontWeight: 600 }}>{paymentModal.bid.productType || paymentModal.request.materialName}</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantity</div>
                  <div style={{ fontWeight: 600 }}>{paymentModal.bid.quantity} {paymentModal.request.unit}</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unit Price</div>
                  <div style={{ fontWeight: 600 }}>Rs. {Number(paymentModal.bid.pricePerUnit).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(46,125,50,0.08)', border: '1px solid var(--success)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>Total Amount Due</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
                Rs. {paymentAmount.toFixed(2)}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="btn flex-1"
                style={{ backgroundColor: 'var(--success)', color: 'white', border: 'none', padding: '12px', fontSize: '1rem', fontWeight: 600 }}
                onClick={handleConfirmPayment}
                disabled={paying}
              >
                {paying ? 'Processing...' : `Pay Rs. ${paymentAmount.toFixed(2)} to Farmer`}
              </button>
              <button className="btn btn-outline" onClick={() => setPaymentModal(null)} disabled={paying}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-4" style={{ border: '2px solid var(--primary)' }}>
          <h4 className="mb-3">Post New Raw Material Request</h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">Material Name</label>
              <select className="form-control" name="materialName" value={formData.materialName} onChange={handleUnitSelect} required>
                <option value="">Select Material</option>
                {rawMaterialsList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity Needed</label>
              <div className="flex gap-2">
                <input type="number" className="form-control" name="quantityNeeded" value={formData.quantityNeeded} onChange={handleChange} required />
                <input type="text" className="form-control" style={{ width: '80px' }} value={formData.unit} readOnly />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Required By Date</label>
              <input type="date" className="form-control" name="requiredByDate" value={formData.requiredByDate} onChange={handleChange} required min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label className="form-label">Min Price per {formData.unit || 'unit'} (Rs.)</label>
              <input type="number" className="form-control" name="minPrice" value={formData.minPrice} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Max Price per {formData.unit || 'unit'} (Rs.)</label>
              <input type="number" className="form-control" name="maxPrice" value={formData.maxPrice} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Quality Specifications</label>
              <textarea className="form-control" name="qualitySpecs" value={formData.qualitySpecs} onChange={handleChange} rows="2" required></textarea>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn btn-primary">Submit Request</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {requests.map(req => (
          <div key={req.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
            <div className="flex justify-between items-center">
              <div>
                <h4 style={{ color: 'var(--primary)', margin: 0 }}>{req.quantityNeeded} {req.unit} of {req.materialName}</h4>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>Needed by: {new Date(req.requiredByDate).toLocaleDateString()} | Target: {formatCurrency(req.minPrice)} - {formatCurrency(req.maxPrice)}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="badge" style={{ backgroundColor: req.status === 'Open' ? 'var(--success)' : 'var(--text-muted)' }}>{req.status}</div>
                <div className="badge">{req.Bids?.length || 0} Bids</div>
              </div>
            </div>

            {expandedId === req.id && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <h5>Farmer Bids</h5>
                {(!req.Bids || req.Bids.length === 0) ? (
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>No bids received yet.</p>
                ) : (
                  <table className="w-full text-left" style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)' }}>
                        <th className="pb-2">Farmer</th>
                        <th className="pb-2">District</th>
                        <th className="pb-2">Quantity</th>
                        <th className="pb-2">Price (Rs.)</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.Bids.map(bid => (
                        <tr key={bid.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                          <td className="py-2">{bid.farmer?.name}</td>
                          <td>{bid.farmer?.district}</td>
                          <td>{bid.quantity}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(bid.pricePerUnit)}</td>
                          <td>{new Date(bid.availabilityDate).toLocaleDateString()}</td>
                          <td>
                            <span className="badge" style={{ 
                              backgroundColor: bid.status === 'Accepted' ? 'var(--info)' : 
                                bid.status === 'Rejected' ? 'var(--danger)' : 
                                bid.status === 'Delivered & Paid' ? 'var(--success)' :
                                bid.status === 'Dispatched' ? 'var(--primary)' : 'var(--warning)' 
                            }}>
                              {bid.status}
                            </span>
                          </td>
                          <td className="text-right">
                            {bid.status === 'Pending' && req.status === 'Open' && (
                              <div className="flex justify-end gap-2">
                                <button className="btn" style={{ backgroundColor: 'var(--success)', color: 'white', padding: '4px 8px', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); handleBidAction(bid.id, 'Accepted'); }}>Accept</button>
                                <button className="btn" style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '4px 8px', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); handleBidAction(bid.id, 'Rejected'); }}>Reject</button>
                              </div>
                            )}
                            {(bid.status === 'Accepted' || bid.status === 'Dispatched') && (
                              <button
                                className="btn"
                                style={{ backgroundColor: 'var(--success)', color: 'white', padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={(e) => { e.stopPropagation(); handleReceivedClick(bid, req); }}
                              >
                                <CheckCircle size={14} /> Received
                              </button>
                            )}
                            {bid.status === 'Delivered & Paid' && (
                              <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>✓ Paid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && <div className="text-center text-muted mt-4">No raw material requests posted yet.</div>}
      </div>
    </div>
  );
};

export default RawMaterialRequestBoard;
