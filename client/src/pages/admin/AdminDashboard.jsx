import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApplications } from '../../services/applicationService';
import { getPrograms } from '../../services/programService';

const statusClasses = {
  submitted: 'bg-gray-200 text-gray-800',
  under_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  cash_released: 'bg-emerald-100 text-emerald-900',
};

const statusLabel = (status) => ({ submitted: 'Submitted', under_review: 'Under review', approved: 'Approved', denied: 'Denied', cash_released: 'Cash released' }[status] || status);

const formatDate = (value) => value ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Not available';
const errorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;

function OverviewCard({ label, detail, loading, error, value, action }) {
  return (
    <article className="min-h-40 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
      {loading ? <div className="mt-5 h-9 w-16 animate-pulse rounded bg-gray-100" aria-label={`Loading ${label.toLowerCase()}`} role="status" /> : error ? <p className="mt-5 text-sm font-semibold text-red-700">Unavailable</p> : <p className="mt-4 text-3xl font-bold tracking-tight text-black">{value}</p>}
      <p className="mt-4 text-xs leading-5 text-gray-500">{error || detail}</p>
      {action && <Link className="mt-3 inline-flex min-h-9 items-center text-xs font-bold text-black underline underline-offset-4" to={action.to}>{action.label}</Link>}
    </article>
  );
}

export default function AdminDashboard() {
  const [programs, setPrograms] = useState([]);
  const [applications, setApplications] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [programsError, setProgramsError] = useState('');
  const [applicationsError, setApplicationsError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  const loadPrograms = async () => {
    try {
      setProgramsLoading(true);
      setProgramsError('');
      const response = await getPrograms();
      setPrograms(response.data);
    } catch (error) {
      setProgramsError(errorMessage(error, 'Unable to load active programs.'));
    } finally {
      setProgramsLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      setApplicationsLoading(true);
      setApplicationsError('');
      const response = await getApplications();
      setApplications(response.data);
    } catch (error) {
      setApplicationsError(errorMessage(error, 'Unable to load applications.'));
    } finally {
      setApplicationsLoading(false);
    }
  };

  const refreshDashboard = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    await Promise.all([loadPrograms(), loadApplications()]);
    refreshingRef.current = false;
    setRefreshing(false);
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  const applicationCounts = useMemo(() => ({
    pending: applications.filter((application) => ['submitted', 'under_review'].includes(application.status)).length,
    approved: applications.filter((application) => application.status === 'approved').length,
    cashReleased: applications.filter((application) => application.status === 'cash_released').length,
  }), [applications]);

  const recentApplications = useMemo(() => [...applications]
    .sort((first, second) => new Date(second.submittedAt) - new Date(first.submittedAt))
    .slice(0, 5), [applications]);

  const overviewCards = [
    { label: 'Active Programs', detail: 'Programs currently returned by the active-program API.', loading: programsLoading, error: programsError, value: programs.length, action: { to: '/admin/programs', label: 'Manage programs' } },
    { label: 'Pending Applications', detail: 'Applications that are submitted or under review.', loading: applicationsLoading, error: applicationsError, value: applicationCounts.pending },
    { label: 'Approved', detail: 'Applications currently marked approved.', loading: applicationsLoading, error: applicationsError, value: applicationCounts.approved },
    { label: 'Cash Released', detail: 'Applications currently marked cash released.', loading: applicationsLoading, error: applicationsError, value: applicationCounts.cashReleased },
  ];

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">OVERVIEW</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-black sm:text-4xl">Admin dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">Monitor active financial-assistance programs and application activity from one workspace.</p>
        </div>
        <button className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={refreshDashboard} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh dashboard'}</button>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Application overview">
        {overviewCards.map((card) => <OverviewCard key={card.label} {...card} />)}
      </section>

      <section className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby="recent-applications-heading">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="recent-applications-heading" className="text-lg font-bold text-black">Recent Applications</h2>
            <p className="mt-1 text-sm text-gray-600">The five most recently submitted applications, sorted in this dashboard from the returned data.</p>
          </div>
          <Link className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-800" to="/admin/applications">View all applications</Link>
        </div>

        {applicationsLoading && <div className="space-y-3 p-5 sm:p-6" role="status" aria-label="Loading recent applications"><div className="h-12 animate-pulse rounded bg-gray-100" /><div className="h-12 animate-pulse rounded bg-gray-100" /><div className="h-12 animate-pulse rounded bg-gray-100" /></div>}
        {!applicationsLoading && applicationsError && <div className="p-5 sm:p-6"><p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{applicationsError}</p><button className="mt-3 min-h-10 rounded-lg border border-red-300 px-3 text-sm font-semibold text-red-700" type="button" onClick={refreshDashboard} disabled={refreshing}>Retry</button></div>}
        {!applicationsLoading && !applicationsError && recentApplications.length === 0 && <div className="px-5 py-10 text-center sm:px-6"><p className="text-sm font-medium text-gray-700">No applications have been submitted yet.</p><Link className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-black px-4 text-sm font-semibold text-white" to="/admin/applications">View applications</Link></div>}
        {!applicationsLoading && !applicationsError && recentApplications.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th className="px-5 py-3 font-semibold sm:px-6" scope="col">Applicant</th><th className="px-5 py-3 font-semibold" scope="col">Program</th><th className="px-5 py-3 font-semibold" scope="col">Status</th><th className="px-5 py-3 font-semibold" scope="col">Submitted</th><th className="px-5 py-3 font-semibold sm:px-6" scope="col">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {recentApplications.map((application) => (
                  <tr className="bg-white" key={application._id}>
                    <td className="px-5 py-4 sm:px-6"><p className="font-semibold text-black">{application.applicant?.name || application.personalInfo?.fullName || 'Applicant unavailable'}</p><p className="mt-1 text-xs text-gray-500">{application.applicant?.email || 'Email not available'}</p></td>
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
