import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
import GuestLayout from './layouts/GuestLayout';
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerBooking from './pages/CustomerBooking';
import CustomerLoyalty from './pages/CustomerLoyalty';
import CustomerHistory from './pages/CustomerHistory';
import CustomerProfile from './pages/CustomerProfile';
import CustomerVehicles from './pages/CustomerVehicles';
import AdminDashboard from './pages/AdminDashboard';
import AdminQueue from './pages/AdminQueue';
import AdminCustomers from './pages/AdminCustomers';
import AdminServices from './pages/AdminServices';
import AdminPromotions from './pages/AdminPromotions';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Guest Routes */}
          <Route element={<GuestLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Customer Routes (Protected) */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="booking" element={<CustomerBooking />} />
            <Route path="loyalty" element={<CustomerLoyalty />} />
            <Route path="history" element={<CustomerHistory />} />
            <Route path="profile" element={<CustomerProfile />} />
            <Route path="vehicles" element={<CustomerVehicles />} />
          </Route>

          {/* Admin Routes (Protected) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="queue" element={<AdminQueue />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="promotions" element={<AdminPromotions />} />
          </Route>

          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
