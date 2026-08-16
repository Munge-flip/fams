import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 px-6">
      <p className="text-sm font-medium text-gray-700" role="status">Checking your session…</p>
    </main>
  );
}

const destinationFor = (user) => (user.role === 'admin' ? '/admin' : '/dashboard');

export function PublicOnlyRoute() {
  const { loading, user } = useAuth();

  if (loading) return <LoadingScreen />;
  return user ? <Navigate to={destinationFor(user)} replace /> : <Outlet />;
}

export function ProtectedRoute({ adminOnly = false }) {
  const { loading, user } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (!adminOnly && user.role === 'admin') return <Navigate to="/admin" replace />;

  return <Outlet />;
}
