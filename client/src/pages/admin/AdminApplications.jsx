import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApplications } from '../../services/applicationService';

const statusClasses = {
  submitted: 'bg-gray-200 text-gray-800',
  under_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  cash_released: 'bg-emerald-100 text-emerald-900',
};

const statusLabel = (status) => ({
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  denied: 'Denied',
  cash_released: 'Cash released',
}[status] || status);

const formatDate = (value) => value ? new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(value)) : 'Not available';

const requestError = (error, fallback) => error.response?.data?.message || error.message || fallback;

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getApplications();
      setApplications(response.data);
    } catch (requestErrorValue) {
      setError(requestError(requestErrorValue, 'Unable to load applications.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">APPLICATION REVIEW</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-black">Applications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Review submitted financial-assistance applications and update their status.</p>
        </div>
        <button className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={loadApplications} disabled={loading}>Refresh</button>
      </section>

      {error && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert"><span>{error}</span><button className="min-h-10 rounded-lg border border-red-300 px-3 font-semibold" type="button" onClick={loadApplications}>Retry</button></div>}

      <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby="application-list-heading">
        <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-black" id="application-list-heading">All applications</h2>
          <p className="mt-1 text-sm text-gray-600">The API returns the full application list; no filters, search, or pagination are available.</p>
        </div>

        {loading && <p className="p-6 text-sm text-gray-600" role="status">Loading applications…</p>}
        {!loading && !error && applications.length === 0 && <p className="p-6 text-sm text-gray-600">No applications have been submitted yet.</p>}
        {!loading && applications.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold sm:px-6" scope="col">Applicant</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Program</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Status</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Submitted</th>
                  <th className="px-5 py-3 font-semibold sm:px-6" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {applications.map((application) => (
                  <tr className="bg-white" key={application._id}>
                    <td className="px-5 py-4 sm:px-6">
                      <p className="font-semibold text-black">{application.applicant?.name || application.personalInfo?.fullName || 'Applicant unavailable'}</p>
                      <p className="mt-1 text-xs text-gray-500">{application.applicant?.email || 'Email not available'}</p>
                    </td>
                    <td className="max-w-xs px-5 py-4 font-medium text-gray-800">{application.program?.title || 'Aid program unavailable'}</td>
                    <td className="px-5 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[application.status] || statusClasses.submitted}`}>{statusLabel(application.status)}</span></td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-700">{formatDate(application.submittedAt)}</td>
                    <td className="px-5 py-4 sm:px-6"><Link className="inline-flex min-h-9 items-center rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800" to={`/admin/applications/${application._id}`}>Review</Link></td>
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
