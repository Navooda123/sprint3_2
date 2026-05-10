import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Package, AlertCircle, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { useLanguage } from '../../context/LanguageContext';

const OutletInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const socket = useSocket();
  const { t } = useLanguage();

  useEffect(() => {
    fetchInventory();
    if (socket) {
      socket.on('inventory:replenished', (data) => {
        toast.success(`📦 ${t('inventory.replenished').replace('{qty}', data.quantity)}`, { duration: 5000 });
        fetchInventory();
      });
    }
    return () => { if (socket) socket.off('inventory:replenished'); };
  }, [socket]);

  const fetchInventory = async () => {
    try {
      const res = await axios.get('/outlet/inventory');
      setInventory(res.data);
    } catch { toast.error(t('common.error')); }
    finally { setLoading(false); }
  };

  const handleAdjustStock = async () => {
    if (!editingItem) return;
    const newQty = parseInt(editQuantity);
    if (isNaN(newQty) || newQty < 0) { toast.error(t('common.error')); return; }
    setIsSubmitting(true);
    try {
      await axios.put(`/outlet/inventory/${editingItem.id}/adjust`, { new_quantity: newQty });
      toast.success(t('common.success'));
      setEditingItem(null);
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally { setIsSubmitting(false); }
  };

  const openEditModal = (item) => { setEditingItem(item); setEditQuantity(item.quantity.toString()); };
  const lowItems = inventory.filter(i => (i.quantity / i.low_stock_threshold) * 100 <= 25);

  return (
    <div className="space-y-6">
      <div className="bg-nestleBlue rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">{t('inventory.title')}</h2>
          <p className="text-blue-100 text-sm">{inventory.length} {t('inventory.products')} · {lowItems.length} {t('inventory.lowStockAlerts')}</p>
        </div>
        <div className="bg-white/20 p-4 rounded-full"><Package size={36} /></div>
      </div>

      {lowItems.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-xl flex items-start">
          <AlertCircle className="text-orange-500 mr-3 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-bold text-orange-800">⚠️ {lowItems.length} {t('inventory.lowStockWarning')}</p>
            <p className="text-sm text-orange-600">{t('inventory.lowStock')}: {lowItems.map(i => i.product_name).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('inventory.totalProducts'), value: inventory.length, color: 'border-nestleBlue' },
          { label: t('inventory.healthy'), value: inventory.filter(i => (i.quantity / i.low_stock_threshold) * 100 > 50).length, color: 'border-green-400' },
          { label: t('inventory.lowStock'), value: lowItems.length, color: 'border-red-400' },
        ].map(s => (
          <div key={s.label} className={`card border-l-4 ${s.color} py-4 text-center`}>
            <p className="text-2xl font-black text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-nestleBlue border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {inventory.map(inv => {
            const pct = Math.min(100, (inv.quantity / inv.low_stock_threshold) * 100);
            const isLow = pct <= 25;
            const isMid = pct > 25 && pct <= 50;
            return (
              <div key={inv.id} className={`border-2 rounded-xl p-5 ${isLow ? 'border-red-200 bg-red-50' : isMid ? 'border-yellow-200' : 'border-gray-100 bg-white'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{inv.product_name}</h3>
                    <p className="text-xs text-gray-400">{inv.category}</p>
                  </div>
                  {isLow && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">{t('inventory.lowStockLabel')}</span>}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <p className={`text-3xl font-black ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                    {inv.quantity} <span className="text-sm font-medium text-gray-400">{t('common.units')}</span>
                  </p>
                  <button onClick={() => openEditModal(inv)} className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors shadow-sm" title={t('inventory.adjustStock')}>
                    <Edit2 size={14} />
                  </button>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1 mt-3">
                  <div className={`h-2 rounded-full ${isLow ? 'bg-red-500' : isMid ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${pct}%` }}></div>
                </div>
                <p className="text-[10px] text-gray-400">{Math.round(pct)}% · {t('inventory.minThreshold')}: {inv.low_stock_threshold} {t('common.units')}</p>
              </div>
            );
          })}
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-1">{t('inventory.adjustWarehouse')}</h3>
            <p className="text-sm text-gray-500 mb-4">{editingItem.product_name}</p>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.newQuantity')}</label>
              <input type="number" min="0" value={editQuantity} onChange={e => setEditQuantity(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold text-lg focus:outline-none focus:border-nestleBlue" autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={handleAdjustStock} disabled={isSubmitting} className="flex-1 btn btn-primary py-2.5 disabled:opacity-50">
                {isSubmitting ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={() => setEditingItem(null)} className="btn border border-gray-300 py-2.5">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutletInventory;
