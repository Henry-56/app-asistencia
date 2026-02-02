import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useEffect, Suspense, lazy } from 'react';

// Lazy Load Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ScanQRPage = lazy(() => import('./pages/ScanQRPage'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const QRGeneratorPage = lazy(() => import('./pages/QRGeneratorPage')); // Note: This might not be used in routes yet but keeping consistency if it was imported
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const FixedQRPage = lazy(() => import('./pages/FixedQRPage'));

// Protected Route Component
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Loading Spinner Component
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

function App() {
  const { token, fetchMe, loading } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchMe();
    }
  }, [token, fetchMe]);

  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />

      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          {/* Rutas para usuarios (Colaboradores/Practicantes) */}
          <Route
            path="/scan"
            element={
              <ProtectedRoute allowedRoles={['COLABORADOR', 'PRACTICANTE']}>
                <ScanQRPage />
              </ProtectedRoute>
            }
          />

          {/* Rutas para Admin */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="fixed-qr" element={<FixedQRPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
