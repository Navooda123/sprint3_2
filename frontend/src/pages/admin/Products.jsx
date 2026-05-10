import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Package, Plus, Send, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatchModal, setDispatchModal] = useState(null);
  const [dispatchData, setDispatchData] = useState({ outlet_id: '', quantity: '' });
  const [isDispatching, setIsDispatching] = useState(false);
  const { t } = useLanguage();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [prodRes, outRes] = await Promise.all([
        axios.get('/admin/products'),
        axios.get('/admin/outlets')
      ]);
      setProducts(prodRes.data);
      setOutlets(outRes.data);
    } catch { toast.error(t('common.error')); }
    finally { setLoading(false); }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchData.outlet_id || !dispatchData.quantity) { toast.error(t('common.error')); return; }
    setIsDispatching(true);
    try {
      await axios.post('/admin/dispatch-to-outlet', {
        product_id: dispatchModal.id,
        outlet_id: dispatchData.outlet_id,
        quantity: dispatchData.quantity
      });
      toast.success(`${t('common.success')}!`);
      setDispatchModal(null);
      setDispatchData({ outlet_id: '', quantity: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.error'));
    } finally { setIsDispatching(false); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-nestleBlue rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">{t('products.title')}</h2>
          <p className="text-blue-100 text-sm">{t('products.subtitle')}</p>
        </div>
        <div className="bg-white/20 p-4 rounded-full"><Package size={36} /></div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800 text-lg">{t('products.allProducts')} ({products.length})</h3>
        <button className="btn btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> {t('products.addProduct')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-nestleBlue border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map(product => (
            <div key={product.id} className="card p-0 overflow-hidden border-2 border-gray-100 hover:border-nestleBlue transition-colors">
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-800 text-lg">{product.name}</h4>
                  <p className="text-xs text-gray-500">{product.category}</p>
                </div>
                {product.is_trending && (
                  <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-md">
                    <TrendingUp size={12} /> {t('products.trending')}
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="flex justify-between items-end mb-5">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{t('products.factoryPrice')}</p>
                    <p className="text-xl font-black text-nestleBlue">LKR {parseFloat(product.price_per_unit || product.price || 0).toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => setDispatchModal(product)}
                  className="w-full btn bg-gray-900 hover:bg-black text-white flex items-center justify-center gap-2 py-2.5">
                  <Send size={16} /> {t('products.sendToOutlet')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dispatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">{t('products.dispatchTitle')}</h3>
              <button onClick={() => setDispatchModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-5 flex items-center gap-3">
              <div className="bg-white p-2 rounded-md shadow-sm text-nestleBlue"><Package size={20} /></div>
              <div>
                <p className="font-bold text-gray-800">{dispatchModal.name}</p>
                <p className="text-xs text-gray-500">{t('products.factoryPrice')}: LKR {parseFloat(dispatchModal.price_per_unit || dispatchModal.price || 0).toLocaleString()}</p>
              </div>
            </div>

            <form onSubmit={handleDispatch} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{t('products.selectOutlet')}</label>
                <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-nestleBlue focus:ring-1 focus:ring-nestleBlue"
                  value={dispatchData.outlet_id}
                  onChange={e => setDispatchData({...dispatchData, outlet_id: e.target.value})}
                  required>
                  <option value="">{t('products.chooseOutlet')}</option>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>{o.name} ({o.province} {t('products.province')})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{t('common.quantity')} ({t('common.units')})</label>
                <input type="number" min="1"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-nestleBlue focus:ring-1 focus:ring-nestleBlue"
                  placeholder="e.g. 500"
                  value={dispatchData.quantity}
                  onChange={e => setDispatchData({...dispatchData, quantity: e.target.value})}
                  required />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="submit" disabled={isDispatching}
                  className="flex-1 btn btn-primary py-2.5 disabled:opacity-50 flex justify-center items-center gap-2">
                  {isDispatching ? t('common.sending') : <><Send size={16} /> {t('products.dispatchStock')}</>}
                </button>
                <button type="button" onClick={() => setDispatchModal(null)} className="btn border border-gray-300 py-2.5">
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
