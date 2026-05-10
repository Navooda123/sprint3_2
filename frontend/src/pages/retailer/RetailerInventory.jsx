import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Package, AlertCircle, CheckCircle, Clock, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const RetailerInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    try {
      const res = await axios.get('/retailer/inventory');
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
      await axios.put(`/retailer/inventory/${editingItem.id}/adjust`, { new_quantity: newQty });
      toast.success(t('common.success'));
      setEditingItem(null);
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally { setIsSubmitting(false); }
  };

  const openEditModal = (item) => { setEditingItem(item); setEditQuantity(item.quantity.toString()); };
  const lowStockItems = inventory.filter(i => (i.quantity / i.low_stock_threshold) * 100 <= 25);

  return (
    <div className="space-y-6">
      <div className="bg-nestleBlue rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">{t('inventory.retailerTitle')}</h2>
          <p className="text-blue-100 text-sm">{inventory.length} {t('inventory.products')} · {lowStockItems.length} {t('inventory.lowStockAlerts')}</p>
        </div>
        <div className="bg-white/20 p-4 rounded-full"><Package size={36} /></div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-xl flex items-start">
          <AlertCircle className="text-orange-500 mr-3 mt-0.5 shrink-0" size={22} />
          <div>
            <h4 className="text-orange-800 font-bold">⚠️ {lowStockItems.length} {t('inventory.lowStockWarning')}</h4>
            <p className="text-sm text-orange-700 mt-0.5">{t('inventory.lowStock')}: {lowStockItems.map(i => i.product_name).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <p className="text-2xl font-black text-gray-800">{inventory.length}</p>
          <p className="text-xs text-gray-500 mt-1">{t('inventory.totalProducts')}</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-black text-green-600">{inventory.filter(i => (i.quantity / i.low_stock_threshold) * 100 > 50).length}</p>
          <p className="text-xs text-gray-500 mt-1">{t('inventory.healthy')}</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-black text-red-600">{lowStockItems.length}</p>
          <p className="text-xs text-gray-500 mt-1">{t('inventory.lowStock')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-nestleBlue border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {inventory.map(inv => {
            const pct = Math.min(100, (inv.quantity / inv.low_stock_threshold) * 100);
            const isLow = pct <= 25;
            const isMid = pct > 25 && pct <= 50;
            const days = inv.days_until_empty;
            const barColor = isLow ? 'bg-red-500' : isMid ? 'bg-yellow-400' : 'bg-green-500';
            const borderColor = isLow ? 'border-red-200' : isMid ? 'border-yellow-200' : 'border-gray-100';
            const bgColor = isLow ? 'bg-red-50' : isMid ? 'bg-yellow-50/40' : 'bg-white';
            const daysColor = days < 7 ? 'text-red-600 font-black' : days < 14 ? 'text-yellow-600 font-bold' : 'text-green-600';

            return (
              <div key={inv.id} className={`border-2 rounded-xl p-5 transition-all ${borderColor} ${bgColor}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">{inv.product_name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{inv.category}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${isLow ? 'bg-red-100' : 'bg-gray-100'}`}>
                    {isLow ? <AlertCircle className="text-red-500" size={18} /> : <CheckCircle className="text-green-500" size={18} />}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-3xl font-black ${isLow ? 'text-red-600' : 'text-gray-800'}`}>{inv.quantity}</span>
                      <button onClick={() => openEditModal(inv)}
                        className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                        title={t('inventory.adjustStock')}>
                        <Edit2 size={14} />
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">/ {inv.low_stock_threshold} {t('inventory.minThreshold')}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400">{Math.round(pct)}%</span>
                    {isLow && <span className="text-[10px] text-red-500 font-bold animate-pulse">{t('inventory.reorderNow')}</span>}
                  </div>
                </div>

                <div className={`flex items-center gap-2 pt-3 border-t ${borderColor}`}>
                  <Clock size={13} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-500">{t('inventory.burnRate').replace('{days}', days)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-1">{t('inventory.adjustRetailer')}</h3>
            <p className="text-sm text-gray-500 mb-4"><strong>{editingItem.product_name}</strong></p>
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

export default RetailerInventory;
