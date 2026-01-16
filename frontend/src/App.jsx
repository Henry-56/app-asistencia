import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';

import LoginPage from './pages/LoginPage';
import ScanQRPage from './pages/ScanQRPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import QRGeneratorPage from './pages/QRGeneratorPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';

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

function App() {
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchMe();
    }
  }, [token, fetchMe]);

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
          <Route path="qr-generator" element={<QRGeneratorPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
