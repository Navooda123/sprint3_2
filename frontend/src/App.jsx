import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Layout from './components/shared/Layout';
import Login from './pages/Login';

// Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import Bids from './pages/admin/Bids';
import Products from './pages/admin/Products';
import AdminPayments from './pages/admin/Payments';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import FarmerBids from './pages/farmer/FarmerBids';
import FarmerPayments from './pages/farmer/FarmerPayments';
import TransporterDashboard from './pages/transporter/TransporterDashboard';
import TransporterJourney from './pages/transporter/TransporterJourney';
import TransporterEarnings from './pages/transporter/TransporterEarnings';
import OutletDashboard from './pages/outlet/OutletDashboard';
import OutletInventory from './pages/outlet/OutletInventory';
import OutletOrders from './pages/outlet/OutletOrders';
import OutletInvoices from './pages/outlet/OutletInvoices';
import RetailerDashboard from './pages/retailer/RetailerDashboard';
import OrderProducts from './pages/retailer/OrderProducts';
import RetailerInvoices from './pages/retailer/RetailerInvoices';
import RetailerInventory from './pages/retailer/RetailerInventory';
import RetailerOrders from './pages/retailer/RetailerOrders';
import PlaceholderPage from './components/shared/PlaceholderPage';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <SocketProvider>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
                <Route path="/admin/bids" element={<Layout><Bids /></Layout>} />
                <Route path="/admin/products" element={<Layout><Products /></Layout>} />
                <Route path="/admin/payments" element={<Layout><AdminPayments /></Layout>} />
                <Route path="/admin/*" element={<Layout><PlaceholderPage /></Layout>} />
              </Route>

              {/* Farmer Routes */}
              <Route element={<ProtectedRoute allowedRoles={['farmer']} />}>
                <Route path="/farmer" element={<Layout><FarmerDashboard /></Layout>} />
                <Route path="/farmer/bids" element={<Layout><FarmerBids /></Layout>} />
                <Route path="/farmer/payments" element={<Layout><FarmerPayments /></Layout>} />
                <Route path="/farmer/*" element={<Layout><PlaceholderPage /></Layout>} />
              </Route>

              {/* Transporter Routes */}
              <Route element={<ProtectedRoute allowedRoles={['transporter']} />}>
                <Route path="/transporter" element={<Layout><TransporterDashboard /></Layout>} />
                <Route path="/transporter/journey" element={<Layout><TransporterJourney /></Layout>} />
                <Route path="/transporter/earnings" element={<Layout><TransporterEarnings /></Layout>} />
                <Route path="/transporter/*" element={<Layout><PlaceholderPage /></Layout>} />
              </Route>

              {/* Outlet Routes */}
              <Route element={<ProtectedRoute allowedRoles={['outlet']} />}>
                <Route path="/outlet" element={<Layout><OutletDashboard /></Layout>} />
                <Route path="/outlet/inventory" element={<Layout><OutletInventory /></Layout>} />
                <Route path="/outlet/orders" element={<Layout><OutletOrders /></Layout>} />
                <Route path="/outlet/invoices" element={<Layout><OutletInvoices /></Layout>} />
                <Route path="/outlet/*" element={<Layout><PlaceholderPage /></Layout>} />
              </Route>

              {/* Retailer Routes */}
              <Route element={<ProtectedRoute allowedRoles={['retailer']} />}>
                <Route path="/retailer" element={<Layout><RetailerDashboard /></Layout>} />
                <Route path="/retailer/order" element={<Layout><OrderProducts /></Layout>} />
                <Route path="/retailer/invoices" element={<Layout><RetailerInvoices /></Layout>} />
                <Route path="/retailer/inventory" element={<Layout><RetailerInventory /></Layout>} />
                <Route path="/retailer/orders" element={<Layout><RetailerOrders /></Layout>} />
                <Route path="/retailer/*" element={<Layout><PlaceholderPage /></Layout>} />
              </Route>

              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </SocketProvider>
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
