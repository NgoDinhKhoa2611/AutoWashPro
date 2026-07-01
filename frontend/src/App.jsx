import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
const GuestLayout = lazy(() => import('./layouts/GuestLayout'));
const CustomerLayout = lazy(() => import('./layouts/CustomerLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

// Pages
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const CustomerBooking = lazy(() => import('./pages/CustomerBooking'));
const CustomerLoyalty = lazy(() => import('./pages/CustomerLoyalty'));
const CustomerHistory = lazy(() => import('./pages/CustomerHistory'));
const CustomerBookings = lazy(() => import('./pages/CustomerBookings'));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'));
const CustomerVehicles = lazy(() => import('./pages/CustomerVehicles'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminQueue = lazy(() => import('./pages/AdminQueue'));
const AdminCustomers = lazy(() => import('./pages/AdminCustomers'));
const AdminServices = lazy(() => import('./pages/AdminServices'));
const AdminBookings = lazy(() => import('./pages/AdminBookings'));
const AdminTransactions = lazy(() => import('./pages/AdminTransactions'));
const PaymentResult = lazy(() => import('./pages/PaymentResult'));

const PageLoader = () => (
  <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
    <div className="spinner-border text-info" role="status">
      <span className="visually-hidden">Đang tải...</span>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
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
            <Route path="bookings" element={<CustomerBookings />} />
            <Route path="bookings/:id" element={<CustomerBookings />} />
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
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="transactions" element={<AdminTransactions />} />
          </Route>

          {/* Payment Result (accessible by all authenticated users) */}
          <Route path="/payment/result" element={<PaymentResult />} />

          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
