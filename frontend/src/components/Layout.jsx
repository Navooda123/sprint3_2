import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X, Bell, LayoutDashboard, Truck, Leaf, Warehouse, Store, Wallet, Map as MapIcon, ClipboardList, TrendingUp, AlertTriangle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on('notification', (data) => {
        setNotifications(prev => [data, ...prev]);
        toast(data.message, { icon: '🔔' });
      });

      socket.on('low_stock_alert', (data) => {
        toast.error(`${data.retailer} is low on ${data.product}!`);
      });

      socket.on('breakdown_alert', (data) => {
        toast.error(`BREAKDOWN: ${data.transporter} in ${data.province || ''}`);
      });
    }
  }, [socket]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = {
    admin: [
      { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/admin/tracking', label: 'Live Tracking', icon: <MapIcon size={20} /> },
      { path: '/admin/bids', label: 'Farmer Bids', icon: <ClipboardList size={20} /> },
      { path: '/admin/trending', label: 'Trending', icon: <TrendingUp size={20} /> },
      { path: '/admin/payments', label: 'Payments', icon: <Wallet size={20} /> },
    ],
    farmer: [
      { path: '/farmer', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/farmer/bids', label: 'Bids Board', icon: <Leaf size={20} /> },
      { path: '/farmer/payments', label: 'Earnings', icon: <Wallet size={20} /> },
    ],
    transporter: [
      { path: '/transporter', label: 'My Journeys', icon: <Truck size={20} /> },
      { path: '/transporter/earnings', label: 'Earnings', icon: <Wallet size={20} /> },
    ],
    outlet: [
      { path: '/outlet', label: 'Inventory', icon: <Warehouse size={20} /> },
      { path: '/outlet/orders', label: 'Retailer Orders', icon: <ClipboardList size={20} /> },
      { path: '/outlet/breakdowns', label: 'Breakdowns', icon: <AlertTriangle size={20} /> },
    ],
    retailer: [
      { path: '/retailer', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/retailer/products', label: 'Order Stock', icon: <Store size={20} /> },
      { path: '/retailer/invoices', label: 'My Invoices', icon: <Wallet size={20} /> },
    ],
  };

  const items = user ? navItems[user.role.toLowerCase()] : [];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-nestleBlue">Nestlé<span className="text-gray-800">Chain</span></h1>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}><X size={24} /></button>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-nestleBlue flex items-center justify-center text-white text-xl font-bold">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{user?.name}</p>
                <span className="badge bg-blue-100 text-nestleBlue text-[10px]">{user?.role}</span>
              </div>
            </div>

            <nav className="space-y-1">
              {items?.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-nestleBlue text-white shadow-lg shadow-blue-200' : 'text-gray-600 hover:bg-gray-100'}`}
                  end={item.path.split('/').length === 2}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-6 border-t border-gray-100">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:text-nestleRed hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative transition-colors"
              >
                <Bell size={22} />
                {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-nestleRed rounded-full"></span>}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                    <span className="font-bold">Notifications</span>
                    <button className="text-xs text-nestleBlue" onClick={() => setNotifications([])}>Clear All</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">No new notifications</p>
                    ) : (
                      notifications.map((n, i) => (
                        <div key={i} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 cursor-pointer">
                          <p className="text-sm font-medium text-gray-800">{n.message}</p>
                          <span className="text-[10px] text-gray-400">Just now</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
