import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { CreditCard, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const OutletInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { t } = useLanguage();

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      const res = await axios.get('/outlet/invoices');
      setInvoices(res.data);
    } catch { toast.error(t('common.error')); }
    finally { setLoading(false); }
  };

  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + parseFloat(i.amount), 0);
  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);

  const filterLabels = {
    all: t('invoice.allInvoices'),
    unpaid: t('invoice.unpaidInvoices'),
    paid: t('invoice.paidInvoices'),
    overdue: t('invoice.overdueInvoices'),
  };

  return (
    <div className="space-y-6">
      <div className="bg-nestleBlue rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">{t('nav.invoices')}</h2>
          <p className="text-blue-100 text-sm">Outstanding: <strong>LKR {totalOutstanding.toLocaleString()}</strong></p>
        </div>
        <div className="bg-white/20 p-4 rounded-full"><CreditCard size={36} /></div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'unpaid', 'paid', 'overdue'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filter === f ? 'bg-nestleBlue text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {filterLabels[f]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('common.total'), value: invoices.length, color: 'border-gray-300' },
          { label: t('invoice.paidInvoices'), value: invoices.filter(i => i.status === 'paid').length, color: 'border-green-400' },
          { label: t('invoice.overdueInvoices'), value: invoices.filter(i => i.status === 'overdue').length, color: 'border-red-400' },
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
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="font-medium">{t('invoice.noInvoices')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {[t('invoice.invoiceRef'), t('invoice.retailerName'), `${t('common.amount')} (LKR)`, t('invoice.dueDate'), t('common.status')].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(inv => {
                const isOverdue = inv.status === 'overdue';
                const isPaid = inv.status === 'paid';
                return (
                  <tr key={inv.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-gray-800">#{inv.id.substring(0,8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-sm text-gray-700">{inv.retailer_name}</td>
                    <td className="px-6 py-4 font-black text-sm text-nestleBlue">{parseFloat(inv.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(inv.due_date).toLocaleDateString()}
                      {isOverdue && <span className="ml-2 text-xs text-red-500 font-bold">{t('invoice.overdue')}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isPaid ? 'bg-green-100 text-green-700' :
                        isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {isPaid ? <CheckCircle size={11} /> : isOverdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
                        {isPaid ? t('invoice.paid') : isOverdue ? t('invoice.overdue') : t('invoice.unpaid')}
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

export default OutletInvoices;
