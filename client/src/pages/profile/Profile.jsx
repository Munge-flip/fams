import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentBottomNav from '../../components/StudentBottomNav';
import { useAuth } from '../../context/AuthContext';

const profileFields = [
  ['email', 'Email address'],
  ['studentID', 'Student ID'],
  ['course', 'Course'],
  ['yearLevel', 'Year level'],
  ['barangay', 'Barangay'],
  ['contactNo', 'Contact number'],
  ['aidCategory', 'Aid category'],
  ['office', 'Office'],
  ['adminLevel', 'Admin level'],
];

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    if (!window.confirm('Log out of your FAMS account?')) return;

    try {
      setLoggingOut(true);
      setError('');
      await logout();
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto w-full max-w-2xl px-5 py-7 sm:px-8">
        <p className="text-sm font-semibold tracking-[0.2em] text-gray-600">FAMS</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-black">Profile</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">Your account information and session settings.</p>

        <section className="mt-7 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-black">{user?.name || 'FAMS user'}</h2>
              <p className="mt-1 text-sm text-gray-600">{user?.email || 'Email not available'}</p>
            </div>
            <span className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold capitalize text-gray-700">{user?.role || 'user'}</span>
          </div>

          <dl className="mt-6 divide-y divide-gray-100 border-y border-gray-100">
            {profileFields.filter(([field]) => user?.[field] !== undefined && user[field] !== null && user[field] !== '').map(([field, label]) => (
              <div className="flex items-start justify-between gap-5 py-3" key={field}>
                <dt className="text-sm font-semibold text-gray-500">{label}</dt>
                <dd className="text-right text-sm text-gray-800">{field === 'yearLevel' ? `Year ${user[field]}` : user[field]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-black">Session</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">Logging out clears this browser session. You will need to sign in again to access your applications.</p>
          {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button className="mt-5 min-h-12 w-full rounded-xl border border-red-300 px-4 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </section>
      </div>
      <StudentBottomNav />
    </main>
  );
}
