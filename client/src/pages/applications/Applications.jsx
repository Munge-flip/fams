import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ApplicationStatus, { StatusBadge } from '../../components/ApplicationStatus';
import StudentBottomNav from '../../components/StudentBottomNav';
import { getApplications } from '../../services/applicationService';

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not available';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getApplications();
      setApplications(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your applications.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  return <main className="min-h-screen bg-gray-50 pb-24"><div className="mx-auto w-full max-w-3xl px-5 py-7 sm:px-8"><p className="text-sm font-semibold tracking-[0.2em] text-gray-600">FAMS</p><h1 className="mt-3 text-3xl font-bold tracking-tight">My applications</h1><p className="mt-2 text-sm text-gray-600">Track your financial assistance applications.</p>{loading && <p className="mt-6 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600" role="status">Loading applications…</p>}{error && <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"><p className="text-sm text-red-700" role="alert">{error}</p><button onClick={load} className="min-h-10 rounded-lg bg-red-100 px-4 text-sm font-bold text-red-800 disabled:opacity-50" disabled={loading}>Retry</button></div>}{!loading && !error && !applications.length && <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-center"><h2 className="font-bold">No applications yet</h2><p className="mt-2 text-sm text-gray-600">Browse available programs to start an application.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-black px-4 text-sm font-semibold text-white" to="/programs">Browse programs</Link></section>}<div className="mt-6 space-y-4">{applications.map((application) => <Link className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-400" to={`/applications/${application._id}`} key={application._id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-bold leading-6">{application.program?.title || 'Aid program'}</h2>{application.program?.status === 'closed' && <span className="mt-2 inline-flex rounded-full bg-gray-200 px-2.5 py-1 text-xs font-bold text-gray-800">Program closed</span>}</div><StatusBadge status={application.status} /></div><p className="mt-3 text-sm text-gray-600">Submitted {formatDate(application.submittedAt)}</p><p className="mt-1 text-sm text-gray-600">Applicant: {application.personalInfo?.fullName || 'Not provided'}</p><ApplicationStatus status={application.status} /></Link>)}</div></div><StudentBottomNav /></main>;
}
