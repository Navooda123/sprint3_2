import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Clock, ArrowRight, Package, Truck, DollarSign, AlertCircle, ClipboardList } from 'lucide-react';

const iconMap = {
  bid: ClipboardList,
  delivery: Truck,
  payment: DollarSign,
  order: Package,
  alert: AlertCircle,
  default: ArrowRight,
};

const getIcon = (description = '') => {
  const desc = description.toLowerCase();
  if (desc.includes('bid') || desc.includes('ටෙන්ඩ') || desc.includes('ஏலம்')) return iconMap.bid;
  if (desc.includes('delivered') || desc.includes('dispatch') || desc.includes('journey') || desc.includes('depart') || desc.includes('arrived')) return iconMap.delivery;
  if (desc.includes('payment') || desc.includes('paid') || desc.includes('lkr')) return iconMap.payment;
  if (desc.includes('order')) return iconMap.order;
  if (desc.includes('alert') || desc.includes('block')) return iconMap.alert;
  return iconMap.default;
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const ActivityLog = ({ endpoint }) => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(endpoint);
        setLogs(res.data);
      } catch (e) {}
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [endpoint]);

  if (logs.length === 0) return null;

  return (
    <div className="card mt-6">
      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 flex items-center">
        <Clock size={14} className="mr-2" /> Recent Activity
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {logs.map(log => {
          const Icon = getIcon(log.action_description);
          return (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="p-1.5 bg-blue-50 rounded-md text-nestleBlue mt-0.5 shrink-0">
                <Icon size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 leading-snug">{log.action_description}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(log.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityLog;
