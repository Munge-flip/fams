import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import Programs from './pages/programs/Programs';
import Apply from './pages/apply/Apply';
import Applications from './pages/applications/Applications';
import ApplicationDetail from './pages/applications/ApplicationDetail';

function DayFourPlaceholder({ title, detail }) {
  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 px-5">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold tracking-[0.2em] text-gray-600">FAMS</p>
        <h1 className="mt-4 text-2xl font-bold text-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{detail}</p>
      </section>
    </main>
  );
}

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
      </Route>
      <Route element={<ProtectedRoute adminOnly />}>
        <Route path="/admin" element={<DayFourPlaceholder title="Admin area" detail="You are signed in as an administrator. Admin dashboard features are scheduled for Day 6." />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
