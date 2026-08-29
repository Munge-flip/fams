import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { label: 'Dashboard', to: '/admin', end: true },
  { label: 'Programs', to: '/admin/programs' },
  { label: 'Applications', to: '/admin/applications' },
  { label: 'Account', to: '/admin/account' },
];

const linkClasses = ({ isActive }) => `flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition ${isActive ? 'bg-white text-black shadow-sm' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`;

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const handleLogout = async () => {
    if (!window.confirm('Log out of your FAMS administrator account?')) return;

    try {
      setLoggingOut(true);
      setLogoutError('');
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(error.message || 'Unable to log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-950 lg:flex">
      <aside className="border-b border-gray-800 bg-black text-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:py-7">
          <div>
            <p className="text-sm font-bold tracking-[0.2em]">FAMS</p>
            <p className="mt-1 text-xs text-gray-400">Administrator portal</p>
          </div>
          <span className="rounded-full border border-gray-700 px-2.5 py-1 text-xs font-semibold lg:hidden">Admin</span>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-gray-800 px-3 py-3 lg:block lg:space-y-1 lg:border-t-0 lg:px-4" aria-label="Administrator navigation">
          {navigation.map((item) => (
            <NavLink className={linkClasses} end={item.end} key={item.to} to={item.to}>{item.label}</NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-gray-800 p-4 lg:mt-auto lg:block">
          <p className="truncate px-3 text-sm font-semibold">{user?.name || 'Administrator'}</p>
          <p className="mt-1 truncate px-3 text-xs text-gray-400">{user?.office || user?.email}</p>
          {logoutError && <p className="mt-3 rounded-lg bg-red-950 px-3 py-2 text-xs text-red-200" role="alert">{logoutError}</p>}
          <button className="mt-4 min-h-11 w-full rounded-lg border border-gray-700 px-3 text-left text-sm font-semibold text-gray-200 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-64">
        <header className="border-b border-gray-200 bg-white px-5 py-4 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Administration</p>
              <p className="mt-1 text-sm font-medium text-gray-700">Financial Assistance Management System</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-black">{user?.name || 'Administrator'}</p>
              <p className="mt-1 text-xs text-gray-500">{user?.office || 'FAMS Admin'}</p>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
