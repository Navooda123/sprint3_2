import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { DollarSign, CheckCircle, Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { t } = useLanguage();

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try {
      const res = await axios.get('/admin/payments');
      setPayments(res.data);
    } catch { toast.error(t('common.error')); }
    finally { setLoading(false); }
  };

  const totalVolume = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const completed = payments.filter(p => p.status === 'completed').length;
  const filtered = filter === 'all' ? payments : payments.filter(p => p.payment_type === filter);

  const TYPE_LABELS = {
    farmer_delivery:      { label: t('payments.farmerPayments'), color: 'bg-green-100 text-green-700', icon: <ArrowUpRight size={12} /> },
    retailer_invoice:     { label: t('payments.retailerInvoices'), color: 'bg-blue-100 text-blue-700', icon: <ArrowDownLeft size={12} /> },
    transporter_payment:  { label: t('payments.transporter'), color: 'bg-purple-100 text-purple-700', icon: <ArrowUpRight size={12} /> },
    transporter_journey:  { label: t('payments.transporter'), color: 'bg-purple-100 text-purple-700', icon: <ArrowUpRight size={12} /> },
  };

  return (
    <div className="space-y-6">
      <div className="bg-nestleBlue rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">{t('payments.title')}</h2>
          <p className="text-blue-100 text-sm">{t('payments.totalVolume')}: <strong>LKR {totalVolume.toLocaleString()}</strong> · {payments.length} {t('payments.transactions')}</p>
        </div>
        <div className="bg-white/20 p-4 rounded-full"><DollarSign size={36} /></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('payments.totalTransactions'), value: payments.length, color: 'border-gray-300', textColor: 'text-gray-800' },
          { label: t('payments.completed'), value: completed, color: 'border-green-400', textColor: 'text-green-600' },
          { label: t('payments.pending'), value: payments.filter(p => p.status === 'pending').length, color: 'border-yellow-400', textColor: 'text-yellow-600' },
          { label: t('payments.totalVolumeStat'), value: `LKR ${Math.round(totalVolume / 1000)}k`, color: 'border-nestleBlue', textColor: 'text-nestleBlue' },
        ].map(s => (
          <div key={s.label} className={`card border-l-4 ${s.color} py-4 text-center`}>
            <p className={`text-2xl font-black ${s.textColor}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: t('common.all') },
          { key: 'farmer_delivery', label: t('payments.farmerPayments') },
          { key: 'retailer_invoice', label: t('payments.retailerInvoices') },
          { key: 'transporter_journey', label: t('payments.transporter') },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f.key ? 'bg-nestleBlue text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-nestleBlue border-t-transparent"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <DollarSign className="mx-auto mb-3 opacity-30" size={40} />
          <p className="font-medium">{t('payments.noPayments')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {[t('common.date'), t('common.status'), t('payments.from'), t('payments.to'), `${t('common.amount')} (LKR)`, t('common.status')].map((h, i) => (
                  i !== 1 && <th key={i} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const meta = TYPE_LABELS[p.payment_type] || { label: p.payment_type, color: 'bg-gray-100 text-gray-600', icon: null };
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(p.created_at).toLocaleDateString()}<br />
                      <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${meta.color}`}>
                        {meta.icon}{meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{p.payer_name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{p.payee_name}</td>
                    <td className="px-6 py-4 font-black text-nestleBlue">{parseFloat(p.amount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {p.status === 'completed' ? <CheckCircle size={11} /> : <Clock size={11} />}
                        {p.status === 'completed' ? t('payments.completed') : t('payments.pending')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
