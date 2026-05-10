import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

const MAX_CAPACITY = 100;
const LOW_THRESHOLD = 0.25;

const ADJUSTMENT_REASONS = [
  'Received delivery',
  'Damaged goods',
  'Stocktake correction',
  'Other'
];

const OutletStock = ({ refreshStats, stockHistory, setStockHistory }) => {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ newQuantity: '', reason: '' });
  const [lowStockAlerts, setLowStockAlerts] = useState([]);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/outlet/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setInventory(await res.json());
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    const newQty = parseInt(adjustForm.newQuantity);
    if (isNaN(newQty) || newQty < 0) return toast.error('Invalid quantity');

    try {
      const res = await fetch(`http://localhost:5000/api/outlet/inventory/${adjustingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newQuantity: newQty, reason: adjustForm.reason })
      });

      if (res.ok) {
        const data = await res.json();
        const productName = adjustingItem.product?.name;

        // Log to shared history state
        if (setStockHistory) {
          setStockHistory(prev => [
            {
              id: Date.now(),
              date: new Date().toISOString(),
              product: productName,
              oldQty: adjustingItem.quantity,
              newQty,
              reason: adjustForm.reason,
              adjustedBy: user?.name
            },
            ...prev
          ]);
        }

        if (data.autoReorderCreated) {
          setLowStockAlerts(prev => [productName, ...prev.filter(n => n !== productName)]);
          toast.error(`⚠️ Low stock! Auto-reorder sent to factory for ${productName}.`);
        } else {
          toast.success(`Stock updated for ${productName}`);
        }

        fetchInventory();
        if (refreshStats) refreshStats();
        setAdjustingItem(null);
        setAdjustForm({ newQuantity: '', reason: '' });
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to update stock');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getBarColor = (pct) => {
    if (pct > 50) return 'var(--success)';
    if (pct > 25) return 'var(--warning)';
    return 'var(--danger)';
  };

  if (loading) return <p className="text-muted">Loading inventory...</p>;

  return (
    <div>
      {/* Low Stock Alert Banner */}
      {lowStockAlerts.length > 0 && (
        <div className="mb-4">
          {lowStockAlerts.map(name => (
            <div key={name} className="flex items-center gap-3 mb-2" style={{ backgroundColor: 'rgba(204,0,0,0.08)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '12px 18px', color: 'var(--danger)' }}>
              <AlertTriangle size={18} />
              <span><strong>Low stock alert sent to factory</strong> for <strong>{name}</strong>. Auto-reorder generated.</span>
            </div>
          ))}
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px' }}>
            <h4 className="mb-3">Adjust Stock: {adjustingItem.product?.name}</h4>
            <p className="text-muted mb-3">Current quantity: <strong>{adjustingItem.quantity}</strong> units</p>
            <form onSubmit={handleAdjust} className="flex flex-col gap-3">
              <div className="form-group mb-0">
                <label className="form-label">New Quantity (max {MAX_CAPACITY})</label>
                <input type="number" className="form-control" value={adjustForm.newQuantity} onChange={e => setAdjustForm({ ...adjustForm, newQuantity: e.target.value })} min="0" max={MAX_CAPACITY} required />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Reason for Adjustment</label>
                <select className="form-control" value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} required>
                  <option value="">Select reason...</option>
                  {ADJUSTMENT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="submit" className="btn btn-primary">Save Adjustment</button>
                <button type="button" className="btn btn-outline" onClick={() => setAdjustingItem(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Grid */}
      <div className="grid grid-cols-3 gap-3">
        {inventory.map(item => {
          const pct = Math.min(100, Math.round((item.quantity / MAX_CAPACITY) * 100));
          const isLow = pct <= 25;
          return (
            <div key={item.id} className="card" style={{ border: isLow ? '2px solid var(--danger)' : '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
              {isLow && (
                <div style={{ position: 'absolute', top: 0, right: 0 }}>
                  <span className="badge" style={{ backgroundColor: 'var(--danger)', borderRadius: '0 0 0 8px', animation: 'pulse 1.5s infinite' }}>LOW STOCK</span>
                </div>
              )}
              
              {/* Product Image Placeholder */}
              <div style={{ height: '60px', backgroundColor: 'var(--bg-color)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {item.product?.name?.substring(0, 1)}
              </div>

              <div style={{ fontWeight: 600, marginBottom: '2px' }}>{item.product?.name}</div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '10px' }}>SKU: {item.product?.sku || 'N/A'}</div>

              {/* Animated % Bar */}
              <div style={{ backgroundColor: 'var(--bg-color)', borderRadius: '999px', height: '8px', marginBottom: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', backgroundColor: getBarColor(pct), borderRadius: '999px', transition: 'width 0.8s ease' }}></div>
              </div>

              <div className="flex justify-between" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                <span className="text-muted">{item.quantity} / {MAX_CAPACITY} units</span>
                <span style={{ fontWeight: 600, color: getBarColor(pct) }}>{pct}%</span>
              </div>

              <button className="btn btn-outline w-full" style={{ fontSize: '0.85rem', padding: '6px' }} onClick={() => { setAdjustingItem(item); setAdjustForm({ newQuantity: item.quantity, reason: '' }); }}>
                Adjust Stock
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OutletStock;
