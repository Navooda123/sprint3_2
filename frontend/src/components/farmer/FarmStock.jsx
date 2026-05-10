import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const rawMaterialsList = [
  'Fresh cow milk', 'Coconut', 'Cocoa beans', 'Sugar cane', 
  'Rice flour', 'Maize / corn', 'Cardamom', 'Cinnamon', 
  'Tea leaves', 'Soya'
];

const FarmStock = () => {
  const { token } = useAuth();
  
  // Mock data for farm stock since we didn't build a complex farm inventory model in Phase 1
  // We will simulate it using local state for this dashboard
  const [stock, setStock] = useState([
    { id: 1, material: 'Fresh cow milk', quantity: 500, unit: 'liters', threshold: 100 },
    { id: 2, material: 'Coconut', quantity: 1200, unit: 'units', threshold: 500 },
  ]);

  const [adjustingId, setAdjustingId] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');

  const handleAdjust = (id) => {
    const item = stock.find(s => s.id === id);
    setStock(stock.map(s => s.id === id ? { ...s, quantity: parseInt(newQuantity) || s.quantity } : s));
    toast.success(`Stock for ${item.material} updated.`);
    setAdjustingId(null);
    setNewQuantity('');
  };

  const handleAddStock = (e) => {
    e.preventDefault();
    const material = e.target.material.value;
    const qty = parseInt(e.target.quantity.value);
    const unit = material === 'Fresh cow milk' ? 'liters' : material === 'Coconut' ? 'units' : 'kg';
    
    if (stock.find(s => s.material === material)) {
      return toast.error('Material already exists in stock. Please adjust the existing one.');
    }

    setStock([...stock, { id: Date.now(), material, quantity: qty, unit, threshold: qty * 0.2 }]);
    toast.success('Material added to stock log.');
    e.target.reset();
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2 card">
          <h3 className="mb-3">Current Farm Inventory</h3>
          <table className="w-full text-left" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-2">Material</th>
                <th className="pb-2">Current Stock</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stock.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-4 text-muted">No stock recorded yet.</td></tr>
              ) : (
                stock.map(item => {
                  const isLow = item.quantity <= item.threshold;
                  return (
                    <tr key={item.id} style={{ borderTop: '1px solid var(--border-color)', backgroundColor: isLow ? 'rgba(204,0,0,0.02)' : 'transparent' }}>
                      <td className="py-3" style={{ fontWeight: 500 }}>{item.material}</td>
                      <td>
                        {adjustingId === item.id ? (
                          <div className="flex gap-2">
                            <input 
                              type="number" 
                              className="form-control" 
                              style={{ width: '80px', padding: '4px' }} 
                              defaultValue={item.quantity} 
                              onChange={(e) => setNewQuantity(e.target.value)}
                            />
                            <button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => handleAdjust(item.id)}>Save</button>
                            <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => setAdjustingId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                            {item.quantity} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{item.unit}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {isLow ? (
                          <span className="badge" style={{ backgroundColor: 'var(--danger)' }}>Low Supply</span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: 'var(--success)' }}>Healthy</span>
                        )}
                      </td>
                      <td className="text-right">
                        {adjustingId !== item.id && (
                          <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setAdjustingId(item.id)}>Update Stock</button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="col-span-1">
          {stock.some(s => s.quantity <= s.threshold) && (
            <div className="card mb-4" style={{ borderLeft: '4px solid var(--danger)' }}>
              <h4 style={{ color: 'var(--danger)', margin: 0, marginBottom: '8px' }}>Action Required</h4>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>You have materials running low on supply. Ensure you update your stock before placing new bids.</p>
            </div>
          )}

          <div className="card">
            <h4 className="mb-3">Log New Material</h4>
            <form onSubmit={handleAddStock} className="flex flex-col gap-3">
              <div className="form-group mb-0">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Material Name</label>
                <select className="form-control" name="material" required>
                  <option value="">Select Material</option>
                  {rawMaterialsList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Initial Quantity</label>
                <input type="number" className="form-control" name="quantity" required />
              </div>
              <button type="submit" className="btn btn-primary mt-2">Add to Stock</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmStock;
