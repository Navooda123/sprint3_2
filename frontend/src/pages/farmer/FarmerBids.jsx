import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { ClipboardList, CheckCircle, Clock, Package, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  open:      'bg-blue-100 text-blue-700',
  accepted:  'bg-yellow-100 text-yellow-700',
  delivered: 'bg-purple-100 text-purple-700',
  paid:      'bg-green-100 text-green-700',
};

const FarmerBids = () => {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const socket = useSocket();

  useEffect(() => {
    fetchBids();
    if (socket) {
      socket.on('new_bid', () => { fetchBids(); toast.success('New bid request from the factory!'); });
    }
    return () => { if (socket) socket.off('new_bid'); };
  }, [socket]);

  const fetchBids = async () => {
    try {
      const res = await axios.get('/farmer/bids');
      setBids(res.data);
    } catch { toast.error('Failed to load bids'); }
    finally { setLoading(false); }
  };

  const handleAccept = async (id) => {
    try {
      await axios.put(`/farmer/bids/${id}/accept`);
      toast.success('Bid accepted! Prepare your materials.');
      fetchBids();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to accept bid'); }
  };

  const handleMarkDelivered = async (id) => {
    try {
      await axios.put(`/farmer/bids/${id}/mark-delivered`);
      toast.success('Delivery confirmed! Awaiting factory payment.');
      fetchBids();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to mark delivered'); }
  };

  const filtered = filter === 'all' ? bids : bids.filter(b => b.status === filter);
  const wonBids = bids.filter(b => ['accepted', 'delivered', 'paid'].includes(b.status));

  return (
    <div className="space-y-6">
      <div className="bg-nestleBlue rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Bid Requests</h2>
          <p className="text-blue-100 text-sm">{bids.filter(b => b.status === 'open').length} open bids · {wonBids.length} won</p>
        </div>
        <div className="bg-white/20 p-4 rounded-full"><ClipboardList size={36} /></div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'open', 'accepted', 'delivered', 'paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filter === f ? 'bg-nestleBlue text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-nestleBlue border-t-transparent"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <ClipboardList className="mx-auto mb-3 opacity-30" size={40} />
          <p className="font-medium">No {filter === 'all' ? '' : filter} bids found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(bid => (
            <div key={bid.id} className={`card p-0 overflow-hidden border-2 ${bid.status === 'paid' ? 'border-green-200' : bid.status === 'open' ? 'border-blue-100' : 'border-gray-100'}`}>
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg border border-gray-200">
                    <Package size={18} className="text-nestleBlue" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{bid.material_name}</p>
                    <p className="text-xs text-gray-400">{new Date(bid.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${STATUS_STYLE[bid.status] || 'bg-gray-100 text-gray-500'}`}>
                    {bid.status}
                  </span>
                  <span className="font-black text-xl text-nestleBlue">LKR {parseFloat(bid.bid_amount).toLocaleString()}</span>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Quantity</p>
                    <p className="font-bold text-gray-800">{bid.quantity} {bid.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Bid Type</p>
                    <p className="font-bold text-gray-800 capitalize">{bid.bid_type?.replace('_', ' ')}</p>
                  </div>
                  {bid.status === 'paid' && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Payment</p>
                      <p className="font-bold text-green-600">✓ Released</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {bid.status === 'open' && (
                    <button onClick={() => handleAccept(bid.id)}
                      className="btn btn-primary flex items-center gap-2 text-sm">
                      <CheckCircle size={16} /> Accept Bid
                    </button>
                  )}
                  {bid.status === 'accepted' && (
                    <button onClick={() => handleMarkDelivered(bid.id)}
                      className="btn bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 text-sm">
                      <Send size={16} /> Mark as Delivered
                    </button>
                  )}
                  {bid.status === 'delivered' && (
                    <div className="flex items-center gap-2 text-purple-700 bg-purple-50 px-4 py-2 rounded-lg text-sm font-bold">
                      <Clock size={16} /> Awaiting factory payment confirmation...
                    </div>
                  )}
                  {bid.status === 'paid' && (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg text-sm font-bold">
                      <CheckCircle size={16} /> LKR {parseFloat(bid.bid_amount).toLocaleString()} received!
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FarmerBids;
