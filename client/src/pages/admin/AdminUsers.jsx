import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUsers } from '../../services/userService';

const verificationClasses = {
  incomplete: 'bg-gray-200 text-gray-800',
  pending: 'bg-blue-100 text-blue-800',
  needs_correction: 'bg-red-100 text-red-800',
  verified: 'bg-green-100 text-green-800',
};

const verificationLabel = (status) => ({
  incomplete: 'Incomplete',
  pending: 'Pending',
  needs_correction: 'Needs correction',
  verified: 'Verified',
}[status] || status || 'Incomplete');

const formatDate = (value) => value ? new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(value)) : 'Not available';

const requestError = (error, fallback) => error.response?.data?.message || error.message || fallback;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getUsers();
      setUsers(response.data);
    } catch (requestErrorValue) {
      setError(requestError(requestErrorValue, 'Unable to load users.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">USER MANAGEMENT</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-black">Beneficiaries</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Review registered beneficiaries and their profile verification status.</p>
        </div>
        <button className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={loadUsers} disabled={loading}>Refresh</button>
      </section>

      {error && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert"><span>{error}</span><button className="min-h-10 rounded-lg border border-red-300 px-3 font-semibold" type="button" onClick={loadUsers}>Retry</button></div>}

      <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby="user-list-heading">
        <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-black" id="user-list-heading">All beneficiaries</h2>
          <p className="mt-1 text-sm text-gray-600">Beneficiaries are sorted by registration date, newest first.</p>
        </div>

        {loading && <p className="p-6 text-sm text-gray-600" role="status">Loading users…</p>}
        {!loading && !error && users.length === 0 && <p className="p-6 text-sm text-gray-600">No beneficiaries have registered yet.</p>}
        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold sm:px-6" scope="col">Beneficiary</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Student ID</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Registered</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Verification</th>
                  <th className="px-5 py-3 font-semibold sm:px-6" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {users.map((user) => (
                  <tr className="bg-white" key={user._id}>
                    <td className="px-5 py-4 sm:px-6">
                      <p className="font-semibold text-black">{user.name || 'Name unavailable'}</p>
                      <p className="mt-1 text-xs text-gray-500">{user.email || 'Email not available'}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{user.studentID || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-700">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${verificationClasses[user.verificationStatus] || verificationClasses.incomplete}`}>{verificationLabel(user.verificationStatus)}</span></td>
                    <td className="px-5 py-4 sm:px-6"><Link className="inline-flex min-h-9 items-center rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800" to={`/admin/users/${user._id}`}>Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
