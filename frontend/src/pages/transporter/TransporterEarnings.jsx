import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { DollarSign, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const TransporterEarnings = () => {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => { fetchEarnings(); }, []);

  const fetchEarnings = async () => {
    try {
      const res = await axios.get('/transporter/earnings');
      setEarnings(res.data);
    } catch { toast.error(t('common.error')); }
    finally { setLoading(false); }
  };

  const totalEarned = earnings.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const thisMonth = earnings.filter(p => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-nestleBlue rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">{t('payments.transporterTitle')}</h2>
          <p className="text-blue-100 text-sm">{t('payments.factorySubtitle')}</p>
        </div>
        <div className="bg-white/20 p-4 rounded-full"><DollarSign size={36} /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card border-l-4 border-nestleBlue py-4 text-center">
          <p className="text-2xl font-black text-nestleBlue">LKR {Math.round(totalEarned / 1000)}k</p>
          <p className="text-xs text-gray-500 mt-1">{t('payments.totalEarned')}</p>
        </div>
        <div className="card border-l-4 border-green-400 py-4 text-center">
          <p className="text-2xl font-black text-green-600">LKR {Math.round(thisMonth / 1000)}k</p>
          <p className="text-xs text-gray-500 mt-1">{t('payments.thisMonth')}</p>
        </div>
        <div className="card border-l-4 border-purple-400 py-4 text-center">
          <p className="text-2xl font-black text-purple-600">{earnings.length}</p>
          <p className="text-xs text-gray-500 mt-1">{t('payments.paymentsReceived')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-nestleBlue border-t-transparent"></div>
        </div>
      ) : earnings.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <TrendingUp className="mx-auto mb-3 opacity-30" size={40} />
          <p className="font-medium">{t('payments.noTransporterEarnings')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {[t('common.date'), t('payments.route'), `${t('common.amount')} (LKR)`, t('common.status')].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {earnings.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(p.created_at).toLocaleDateString()}<br />
                    <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    {p.from_location || '—'}
                    {p.to_location ? <> <span className="text-gray-400">→</span> {p.to_location}</> : ''}
                  </td>
                  <td className="px-6 py-4 font-black text-green-600 text-lg">
                    {parseFloat(p.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.status === 'completed' ? <CheckCircle size={11} /> : <Clock size={11} />}
                      {p.status === 'completed' ? t('bids.completed') : t('common.pending')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TransporterEarnings;
