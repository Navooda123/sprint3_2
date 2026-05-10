import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { AlertTriangle, Plus, Minus } from 'lucide-react';
import RetailerReorderModal from './RetailerReorderModal';

const RetailerStock = ({ refreshStats, stockHistory, setStockHistory }) => {
  const { token } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Reorder Modal State
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Adjust Stock State
  const [adjustingId, setAdjustingId] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('Stocktake Correction');

  useEffect(() => {
    fetchInventory();
  }, [token]);

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setInventory(await res.json());
      }
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (item) => {
    try {
      const res = await fetch(`http://localhost:5000/api/inventory/adjust`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          productId: item.productId, 
          adjustAmount, 
          reason: adjustReason 
        })
      });

      if (res.ok) {
        const { inventory: updatedItem } = await res.json();
        
        const updatedInv = inventory.map(i => i.id === item.id ? { ...i, quantity: updatedItem.quantity } : i);
        setInventory(updatedInv);
        
        const historyEntry = {
          id: Date.now(),
          date: new Date().toISOString(),
          productName: item.product?.name || 'Unknown Product',
          oldQty: item.quantity,
          newQty: updatedItem.quantity,
          reason: adjustReason,
          type: 'Manual Adjustment'
        };
        
        setStockHistory(prev => [historyEntry, ...prev]);
        toast.success('Stock adjusted successfully');
        
        if (updatedItem.quantity <= 25 && item.quantity > 25) {
          toast('Auto-reorder generated due to low stock!', { icon: '🤖' });
        }
        
        setAdjustingId(null);
        refreshStats();
      } else {
        toast.error('Failed to adjust stock');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const triggerReorder = (item) => {
    setSelectedProduct(item);
    setShowReorderModal(true);
  };

  const handleReorderSuccess = (orderedQty) => {
    // Record in history that an order was placed
    const historyEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      productName: selectedProduct.product.name,
      oldQty: selectedProduct.quantity,
      newQty: selectedProduct.quantity + orderedQty, // Optimistic, usually happens on delivery
      reason: 'Reorder Placed',
      type: 'Reorder Flow'
    };
    setStockHistory(prev => [historyEntry, ...prev]);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>Live Inventory Status</h3>
        <button className="btn btn-outline" onClick={fetchInventory}>Refresh Grid</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p>Loading...</p> : inventory.map(item => {
          const threshold = item.product?.stockThreshold || 25;
          const isLowStock = item.quantity <= threshold;
          const percentage = Math.min(100, Math.max(0, item.quantity)); // Assuming max capacity is 100

          return (
            <div key={item.id} className="card" style={{ border: isLowStock ? '1px solid var(--danger)' : '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
              
              {isLowStock && (
                <div style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '-20px -20px 15px -20px', animation: 'pulse 2s infinite' }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} />
                    <strong style={{ fontSize: '0.85rem' }}>{item.product?.name || 'Unknown Product'} is running low ({item.quantity} left)</strong>
                  </div>
                  <button 
                    onClick={() => triggerReorder(item)}
                    style={{ backgroundColor: 'white', color: 'var(--danger)', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Place Reorder
                  </button>
                </div>
              )}

              <div className="flex justify-between items-start mb-2">
                <h4 style={{ margin: 0 }}>{item.product?.name || 'Unknown Product'}</h4>
                <span className="badge" style={{ backgroundColor: isLowStock ? 'var(--danger)' : 'var(--success)', color: 'white' }}>
                  {item.quantity} units
                </span>
              </div>
              <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>SKU: {item.product?.sku || 'N/A'}</p>

              <div className="progress-bg mb-4">
                <div 
                  className="progress-bar" 
                  style={{ 
                    width: `${percentage}%`, 
                    backgroundColor: isLowStock ? 'var(--danger)' : percentage < 50 ? 'var(--warning)' : 'var(--success)' 
                  }}
                ></div>
              </div>

              {adjustingId === item.id ? (
                <div style={{ backgroundColor: 'var(--bg-color)', padding: '10px', borderRadius: '4px' }}>
                  <div className="flex gap-2 mb-2">
                    <button className="icon-btn" style={{ border: '1px solid var(--border-color)' }} onClick={() => setAdjustAmount(prev => prev - 1)}><Minus size={14} /></button>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={item.quantity + adjustAmount} 
                      onChange={(e) => setAdjustAmount(parseInt(e.target.value) - item.quantity)}
                      style={{ textAlign: 'center' }}
                    />
                    <button className="icon-btn" style={{ border: '1px solid var(--border-color)' }} onClick={() => setAdjustAmount(prev => prev + 1)}><Plus size={14} /></button>
                  </div>
                  <select className="form-control mb-2" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} style={{ fontSize: '0.8rem', padding: '5px' }}>
                    <option value="Stocktake Correction">Stocktake Correction</option>
                    <option value="Damaged Goods">Damaged Goods</option>
                    <option value="Expired Product">Expired Product</option>
                  </select>
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-full" style={{ padding: '5px' }} onClick={() => handleAdjustSubmit(item)}>Save</button>
                    <button className="btn btn-outline btn-full" style={{ padding: '5px' }} onClick={() => setAdjustingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button 
                  className="btn btn-outline btn-full" 
                  onClick={() => { setAdjustingId(item.id); setAdjustAmount(0); }}
                >
                  Adjust Stock
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showReorderModal && selectedProduct && (
        <RetailerReorderModal 
          product={selectedProduct.product} 
          currentStock={selectedProduct.quantity}
          token={token}
          onClose={() => setShowReorderModal(false)}
          refreshStats={refreshStats}
          onReorderSuccess={handleReorderSuccess}
        />
      )}
    </div>
  );
};

export default RetailerStock;
