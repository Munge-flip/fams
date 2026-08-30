import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentBottomNav from '../../components/StudentBottomNav';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/authService';
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
  const { user, logout, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    studentID: user?.studentID || '',
    course: user?.course || '',
    yearLevel: user?.yearLevel || '',
    barangay: user?.barangay || '',
    contactNo: user?.contactNo || '',
    aidCategory: user?.aidCategory || '',
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await updateProfile(form);
      await refreshUser();
      setSuccess('Profile updated successfully.');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (requestError) {
      setError(requestError.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };


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
      <div className="mx-auto w-full max-w-3xl px-5 py-7 sm:px-8">
        <div className="mb-8 flex flex-col gap-5">
          {user?.verificationStatus === 'pending' && <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">Your profile is awaiting verification.</div>}
          {user?.verificationStatus === 'needs_correction' && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Your profile needs correction. {user.verificationRemarks && <span className="block mt-1">Remark: {user.verificationRemarks}</span>} <span className="block mt-1 font-semibold">Editing and saving this profile will submit it for re-verification.</span></div>}
          {user?.verificationStatus === 'verified' && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">Your profile has been verified.</div>}
        </div>
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

          {user?.verificationStatus === 'needs_correction' && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">Profile needs correction</p>
              <p className="mt-1 text-sm text-red-600">{user.verificationRemarks || 'Please check your information and update your profile.'}</p>
            </div>
          )}

          {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          {success && <p className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</p>}

          <div className="mt-6 space-y-4">
            {editing ? (
              <>
                <label className="block text-sm font-medium text-gray-900">Full name
                  <input className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" name="name" value={form.name} onChange={handleChange} />
                </label>
                {user?.role === 'student' && (
                  <>
                    <label className="block text-sm font-medium text-gray-900">Student ID
                      <input className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" name="studentID" value={form.studentID} onChange={handleChange} />
                    </label>
                    <label className="block text-sm font-medium text-gray-900">Course
                      <input className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" name="course" value={form.course} onChange={handleChange} />
                    </label>
                    <label className="block text-sm font-medium text-gray-900">Year level
                      <input className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" name="yearLevel" type="number" value={form.yearLevel} onChange={handleChange} />
                    </label>
                  </>
                )}
                {user?.role === 'resident' && (
                  <>
                    <label className="block text-sm font-medium text-gray-900">Barangay
                      <input className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" name="barangay" value={form.barangay} onChange={handleChange} />
                    </label>
                    <label className="block text-sm font-medium text-gray-900">Contact number
                      <input className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" name="contactNo" value={form.contactNo} onChange={handleChange} />
                    </label>
                    <label className="block text-sm font-medium text-gray-900">Aid category
                      <select className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" name="aidCategory" value={form.aidCategory} onChange={handleChange}>
                        <option value="">Select a category</option>
                        <option value="scholarship">Scholarship</option>
                        <option value="barangay">Barangay</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </label>
                  </>
                )}
                <div className="flex gap-3 pt-2">
                  <button className="flex-1 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white" onClick={handleSave} disabled={saving}>Save</button>
                  <button className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <dl className="divide-y divide-gray-100">
                  {profileFields.filter(([field]) => user?.[field] !== undefined && user[field] !== null && user[field] !== '').map(([field, label]) => (
                    <div className="flex items-start justify-between gap-5 py-3" key={field}>
                      <dt className="text-sm font-semibold text-gray-500">{label}</dt>
                      <dd className="text-right text-sm text-gray-800">{field === 'yearLevel' ? `Year ${user[field]}` : user[field]}</dd>
                    </div>
                  ))}
                </dl>
                <button className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800" onClick={() => setEditing(true)}>Edit profile</button>
              </>
            )}
          </div>
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
