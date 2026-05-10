import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from './LanguageToggle';
import { 
  LayoutDashboard, Map, Package, Truck, Store, User, LogOut, Bell, BarChart3, ClipboardList
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLinks = {
    admin: [
      { name: t('nav.dashboard'), path: '/admin', icon: LayoutDashboard },
      { name: t('nav.bids'), path: '/admin/bids', icon: ClipboardList },
      { name: t('nav.products'), path: '/admin/products', icon: Package },
      { name: t('nav.payments'), path: '/admin/payments', icon: BarChart3 },
    ],
    farmer: [
      { name: t('nav.dashboard'), path: '/farmer', icon: LayoutDashboard },
      { name: t('nav.bids'), path: '/farmer/bids', icon: ClipboardList },
      { name: t('nav.payments'), path: '/farmer/payments', icon: BarChart3 },
    ],
    transporter: [
      { name: t('nav.dashboard'), path: '/transporter', icon: LayoutDashboard },
      { name: t('nav.journey'), path: '/transporter/journey', icon: Truck },
      { name: t('nav.earnings'), path: '/transporter/earnings', icon: BarChart3 },
    ],
    outlet: [
      { name: t('nav.dashboard'), path: '/outlet', icon: LayoutDashboard },
      { name: t('nav.inventory'), path: '/outlet/inventory', icon: Package },
      { name: t('nav.orders'), path: '/outlet/orders', icon: Store },
      { name: t('nav.invoices'), path: '/outlet/invoices', icon: ClipboardList },
    ],
    retailer: [
      { name: t('nav.dashboard'), path: '/retailer', icon: LayoutDashboard },
      { name: t('nav.orderProducts'), path: '/retailer/order', icon: Package },
      { name: t('nav.myOrders'), path: '/retailer/orders', icon: Store },
      { name: t('nav.invoices'), path: '/retailer/invoices', icon: ClipboardList },
      { name: t('nav.inventory'), path: '/retailer/inventory', icon: Package },
    ],
  };

  const links = user ? (navLinks[user.role] || []) : [];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center justify-center h-16 border-b border-gray-200 bg-nestleBlue shrink-0">
          <span className="text-white font-bold text-xl">NestléChain</span>
        </div>
        <nav className="mt-4 flex-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = location.pathname === link.path || 
              (link.path !== `/${user?.role}` && location.pathname.startsWith(link.path));
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-nestleBlue transition-colors ${
                  isActive ? 'bg-blue-50 text-nestleBlue border-r-4 border-nestleBlue' : ''
                }`}
              >
                <link.icon className="w-5 h-5 mr-3" />
                <span className="font-medium text-sm">{link.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-4 shrink-0">
          <div className="flex items-center mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-nestleBlue flex items-center justify-center text-white mr-3 shrink-0">
              <User size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-gray-700 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role} · {user?.province}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">
            {links.find(l => location.pathname === l.path || (l.path !== `/${user?.role}` && location.pathname.startsWith(l.path)))?.name || t('nav.dashboard')}
          </h2>
          <div className="flex items-center space-x-4">
            <LanguageToggle />
            <button className="relative p-2 text-gray-400 hover:text-nestleBlue transition-colors">
              <Bell size={22} />
              <span className="absolute top-0 right-0 w-4 h-4 bg-nestleRed text-white text-[10px] flex items-center justify-center rounded-full">!</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
