import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import AdminLayout from './components/AdminLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import Programs from './pages/programs/Programs';
import Apply from './pages/apply/Apply';
import Applications from './pages/applications/Applications';
import ApplicationDetail from './pages/applications/ApplicationDetail';
import Profile from './pages/profile/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPrograms from './pages/admin/AdminPrograms';
import AdminSectionPlaceholder from './pages/admin/AdminSectionPlaceholder';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route element={<ProtectedRoute adminOnly />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="programs" element={<AdminPrograms />} />
          <Route path="applications" element={<AdminSectionPlaceholder title="Applications" />} />
          <Route path="account" element={<AdminSectionPlaceholder title="Account" />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
