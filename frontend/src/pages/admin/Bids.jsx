import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { ClipboardList, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const Bids = () => {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    material_name: 'Fresh Milk',
    quantity: '',
    unit: 'L',
    bid_amount: '',
    bid_type: 'open_bid'
  });
  
  const socket = useSocket();

  useEffect(() => {
    fetchBids();

    if (socket) {
      socket.on('bid_accepted', (data) => {
        toast.success(`Farmer ${data.farmerName} accepted a bid!`);
        fetchBids();
      });
      socket.on('delivery_confirmed', (data) => {
        toast.success(`Farmer ${data.farmerName} has delivered raw materials! Please confirm.`);
        fetchBids();
      });
    }

    return () => {
      if (socket) {
        socket.off('bid_accepted');
        socket.off('delivery_confirmed');
      }
    };
  }, [socket]);

  const fetchBids = async () => {
    try {
      const res = await axios.get('/admin/bids');
      setBids(res.data);
    } catch (error) {
      toast.error('Failed to load bids');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBid = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/admin/bids', formData);
      toast.success('Bid published successfully to all farmers!');
      setIsModalOpen(false);
      fetchBids();
      setFormData({ material_name: 'Fresh Milk', quantity: '', unit: 'L', bid_amount: '', bid_type: 'open_bid' });
    } catch (err) {
      toast.error('Failed to publish bid');
    }
  };

  const handleConfirmDelivery = async (id) => {
    try {
      await axios.put(`/admin/bids/${id}/confirm-delivery`);
      toast.success('Delivery confirmed and payment released to farmer!');
      fetchBids();
    } catch (err) {
      toast.error('Failed to confirm delivery');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Raw Material Bids</h2>
          <p className="text-gray-500">Manage sourcing from farmers and payments</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus size={18} className="mr-2" />
          Publish New Bid
        </button>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-gray-500 text-center py-4">Loading bids...</p>
        ) : bids.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No bids found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (LKR)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bids.map(bid => (
                  <tr key={bid.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(bid.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bid.material_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bid.quantity} {bid.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                      {parseFloat(bid.bid_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bid.farmer_name || <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        bid.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        bid.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                        bid.status === 'delivered' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {bid.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {bid.status === 'delivered' && (
                        <button 
                          onClick={() => handleConfirmDelivery(bid.id)}
                          className="text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded shadow-sm text-xs transition"
                        >
                          Confirm & Pay
                        </button>
                      )}
                      {bid.status === 'paid' && (
                        <span className="text-gray-400 text-xs italic">Completed</span>
                      )}
                      {bid.status === 'open' && (
                        <span className="text-gray-400 text-xs italic">Waiting for Farmer</span>
                      )}
                      {bid.status === 'accepted' && (
                        <span className="text-gray-400 text-xs italic">In Progress</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Bid Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Publish New Bid</h3>
            <form onSubmit={handleCreateBid} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
                <select 
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={formData.material_name}
                  onChange={(e) => setFormData({...formData, material_name: e.target.value})}
                  required
                >
                  <option value="Fresh Milk">Fresh Milk</option>
                  <option value="Cocoa Beans">Cocoa Beans</option>
                  <option value="Coconut">Coconut</option>
                  <option value="Sugar">Sugar</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    required
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select 
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="L">Liters (L)</option>
                    <option value="KG">Kilograms (KG)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Payment Amount (LKR)</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={formData.bid_amount}
                  onChange={(e) => setFormData({...formData, bid_amount: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bid Type</label>
                <select 
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={formData.bid_type}
                  onChange={(e) => setFormData({...formData, bid_type: e.target.value})}
                >
                  <option value="open_bid">Open Bid (Any Farmer)</option>
                  <option value="direct_order">Direct Contract</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  className="btn border border-gray-300 flex-1 hover:bg-gray-50"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Publish Bid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bids;
