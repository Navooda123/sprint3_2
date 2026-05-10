import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const RetailerInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unpaid | paid | overdue

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      const res = await axios.get('/retailer/invoices');
      setInvoices(res.data);
    } catch (err) { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  const handlePay = async (id) => {
    try {
      toast.loading('Connecting to PayHere gateway...', { duration: 1500 });
      setTimeout(async () => {
        try {
          await axios.put(`/retailer/invoices/${id}/pay`);
          toast.success('Payment successful via PayHere!');
          fetchInvoices();
        } catch (e) { toast.error('Payment failed'); }
      }, 1800);
    } catch { toast.error('Payment error'); }
  };

  const daysUntilDue = (due_date) => Math.ceil((new Date(due_date) - Date.now()) / 86400000);

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);

  const unpaidTotal = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + parseFloat(i.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-nestleBlue rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Invoices & Payments</h2>
          <p className="text-blue-100 text-sm">Outstanding balance: <strong>LKR {unpaidTotal.toLocaleString()}</strong></p>
        </div>
        <div className="bg-white/20 p-4 rounded-full">
          <CreditCard size={36} />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'unpaid', 'paid', 'overdue'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filter === f ? 'bg-nestleBlue text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-nestleBlue border-t-transparent"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <CheckCircle className="mx-auto mb-3 opacity-30" size={40} />
          <p className="font-medium">No {filter === 'all' ? '' : filter} invoices</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(inv => {
            const due = daysUntilDue(inv.due_date);
            const isOverdue = inv.status === 'overdue' || (inv.status !== 'paid' && due < 0);
            const isDueSoon = inv.status === 'unpaid' && due >= 0 && due <= 3;
            const isPaid = inv.status === 'paid';

            return (
              <div key={inv.id} className={`border-2 rounded-xl overflow-hidden transition-all ${
                isPaid ? 'border-green-200' :
                isOverdue ? 'border-red-300 shadow-md shadow-red-50' :
                isDueSoon ? 'border-amber-300' :
                'border-gray-200'
              }`}>
                {/* Invoice Header */}
                <div className={`px-6 py-4 flex items-center justify-between ${
                  isPaid ? 'bg-green-50' : isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-amber-50' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isPaid ? 'bg-green-100' : isOverdue ? 'bg-red-100' : 'bg-yellow-100'}`}>
                      {isPaid ? <CheckCircle className="text-green-600" size={18} /> :
                       isOverdue ? <AlertTriangle className="text-red-600" size={18} /> :
                       <Clock className="text-yellow-600" size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Invoice #{inv.id.substring(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-500">
                        Issued: {new Date(inv.created_at).toLocaleDateString()} ·
                        Due: {new Date(inv.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-gray-800">LKR {parseFloat(inv.amount).toLocaleString()}</p>
                    <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${
                      isPaid ? 'bg-green-100 text-green-700' :
                      isOverdue ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {isPaid ? '✓ PAID' : isOverdue ? '⚠ OVERDUE' : 'UNPAID'}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="bg-white px-6 py-4 space-y-3">
                  {/* 3-day nudge banner */}
                  {isDueSoon && !isOverdue && (
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2 text-amber-800">
                        <Clock size={16} className="shrink-0" />
                        <span className="text-sm font-medium">
                          This invoice is due in <strong>{due} day{due !== 1 ? 's' : ''}</strong>. Pay now to avoid a late fee.
                        </span>
                      </div>
                      <button onClick={() => handlePay(inv.id)}
                        className="ml-4 btn bg-amber-500 hover:bg-amber-600 text-white text-sm py-1.5 px-4 whitespace-nowrap">
                        Pay Now
                      </button>
                    </div>
                  )}

                  {/* Overdue warning */}
                  {isOverdue && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                      ⛔ This invoice is <strong>{Math.abs(due)} day(s)</strong> overdue. Your account may be blocked at day 14.
                    </div>
                  )}

                  {/* Payment meta */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Payment Type</p>
                      <p className="font-bold capitalize">{inv.payment_type || 'credit'}</p>
                    </div>
                    {isPaid && inv.paid_at && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Paid On</p>
                        <p className="font-bold text-green-600">{new Date(inv.paid_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Pay button */}
                  {!isPaid && !isDueSoon && (
                    <button onClick={() => handlePay(inv.id)}
                      className="w-full btn bg-gray-900 hover:bg-black text-white py-3 font-bold flex items-center justify-center gap-2">
                      <CreditCard size={18} /> Pay via PayHere
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RetailerInvoices;
