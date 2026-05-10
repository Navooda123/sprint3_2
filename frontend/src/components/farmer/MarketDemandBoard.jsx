import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

const MarketDemandBoard = () => {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [biddingOn, setBiddingOn] = useState(null); // stores the request object
  
  const [bidForm, setBidForm] = useState({
    pricePerUnit: '',
    quantity: '',
    availabilityDate: '',
    qualityNotes: ''
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/farmer/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setRequests(await res.json());
    } catch (error) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleBidChange = (e) => {
    setBidForm({ ...bidForm, [e.target.name]: e.target.value });
  };

  const submitBid = async (e) => {
    e.preventDefault();
    const price = parseFloat(bidForm.pricePerUnit);
    
    if (price < parseFloat(biddingOn.minPrice) || price > parseFloat(biddingOn.maxPrice)) {
      if (!window.confirm(`Your price (${formatCurrency(price)}) is outside the factory's target range (${formatCurrency(biddingOn.minPrice)} - ${formatCurrency(biddingOn.maxPrice)}). Are you sure you want to submit this bid?`)) {
        return;
      }
    }

    if (parseInt(bidForm.quantity) > biddingOn.quantityNeeded) {
      return toast.error(`You cannot bid for more than the required quantity (${biddingOn.quantityNeeded}).`);
    }

    try {
      const res = await fetch('http://localhost:5000/api/farmer/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requestId: biddingOn.id,
          productType: biddingOn.materialName,
          ...bidForm
        })
      });

      if (res.ok) {
        toast.success('Bid submitted successfully! Check the My Bids tab.');
        setBiddingOn(null);
        setBidForm({ pricePerUnit: '', quantity: '', availabilityDate: '', qualityNotes: '' });
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to submit bid');
      }
    } catch (error) {
      toast.error('Network error while submitting bid');
    }
  };

  const renderCountdown = (dateString) => {
    const end = new Date(dateString).getTime();
    const now = new Date().getTime();
    const distance = end - now;
    
    if (distance < 0) return <span style={{ color: 'var(--danger)' }}>Expired</span>;
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{days}d {hours}h remaining</span>;
  };

  if (loading) return <div>Loading market demand...</div>;

  return (
    <div>
      <h3 className="mb-3">Open Factory Requests</h3>
      
      {biddingOn && (
        <div className="card mb-4" style={{ border: '2px solid var(--primary)' }}>
          <div className="flex justify-between items-center mb-3">
            <h4 style={{ margin: 0 }}>Place Bid: {biddingOn.materialName}</h4>
            <button className="btn btn-outline" onClick={() => setBiddingOn(null)}>Cancel</button>
          </div>
          
          <div className="mb-3 p-3" style={{ backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius)' }}>
            <strong>Factory Target:</strong> {formatCurrency(biddingOn.minPrice)} - {formatCurrency(biddingOn.maxPrice)} per {biddingOn.unit} <br/>
            <strong>Needed:</strong> {biddingOn.quantityNeeded} {biddingOn.unit}
          </div>

          <form onSubmit={submitBid} className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">Your Price per {biddingOn.unit} (Rs.)</label>
              <input type="number" className="form-control" name="pricePerUnit" value={bidForm.pricePerUnit} onChange={handleBidChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Quantity You Can Supply</label>
              <input type="number" className="form-control" name="quantity" value={bidForm.quantity} onChange={handleBidChange} max={biddingOn.quantityNeeded} required />
            </div>
            <div className="form-group">
              <label className="form-label">Delivery Date to Kurunegala</label>
              <input type="date" className="form-control" name="availabilityDate" value={bidForm.availabilityDate} onChange={handleBidChange} min={new Date().toISOString().split('T')[0]} required />
            </div>
            <div className="form-group">
              <label className="form-label">Quality Certificate (Optional)</label>
              <input type="file" className="form-control" accept=".pdf,.png,.jpg" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Quality Notes / Assurances</label>
              <textarea className="form-control" name="qualityNotes" value={bidForm.qualityNotes} onChange={handleBidChange} rows="2" placeholder="Detail how your harvest meets the factory's quality specifications..."></textarea>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn btn-primary">Submit Bid</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {requests.length === 0 ? (
          <p className="text-center text-muted py-4">No open requests from the factory at this time.</p>
        ) : (
          requests.map(req => (
            <div key={req.id} className="card flex justify-between items-center" style={{ opacity: biddingOn?.id === req.id ? 0.5 : 1 }}>
              <div>
                <h4 style={{ color: 'var(--primary)', margin: 0 }}>{req.quantityNeeded} {req.unit} of {req.materialName}</h4>
                <div style={{ margin: '8px 0' }}>
                  <strong>Target Price:</strong> {formatCurrency(req.minPrice)} - {formatCurrency(req.maxPrice)} | 
                  <strong style={{ marginLeft: '10px' }}>Specs:</strong> {req.qualitySpecs}
                </div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Required by: {new Date(req.requiredByDate).toLocaleDateString()} | {renderCountdown(req.requiredByDate)}
                </div>
              </div>
              <div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => { setBiddingOn(req); setBidForm({ pricePerUnit: '', quantity: '', availabilityDate: '', qualityNotes: '' }); window.scrollTo(0, 0); }}
                  disabled={biddingOn !== null}
                >
                  Place Bid
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MarketDemandBoard;
