import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProgramCard from '../../components/ProgramCard';
import StudentBottomNav from '../../components/StudentBottomNav';
import { useAuth } from '../../context/AuthContext';
import { getPrograms } from '../../services/programService';
import { getApplications } from '../../services/applicationService';

const formatDeadline = (deadline) => new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  weekday: 'short',
}).format(new Date(deadline));

const byDeadline = (first, second) => new Date(first.deadline) - new Date(second.deadline);

export default function Dashboard() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [programsResponse, applicationsResponse] = await Promise.all([
        getPrograms(),
        getApplications()
      ]);
      setPrograms(programsResponse.data || []);
      setApplications(applicationsResponse.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  const upcomingPrograms = useMemo(() => [...programs].sort(byDeadline), [programs]);
  const discoveryPrograms = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return upcomingPrograms.slice(0, 3);

    return upcomingPrograms.filter((program) => [program.title, program.description, program.eligibility, program.category]
      .some((value) => value?.toLowerCase().includes(term)));
  }, [search, upcomingPrograms]);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto w-full max-w-3xl px-5 py-7 sm:px-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-gray-600">FAMS</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-black">Hello, {user.name?.split(' ')[0] || 'there'}.</h1>
          </div>
          <span className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold capitalize text-gray-700">{user.role}</span>
        </header>
        <div className="flex flex-col gap-5 mt-8 mb-8">
          {user?.verificationStatus === 'pending' && <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">Your profile is awaiting verification.</div>}
          {user?.verificationStatus === 'needs_correction' && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Your profile needs correction. {user.verificationRemarks && <span className="block mt-1">Remark: {user.verificationRemarks}</span>} <Link className="font-semibold underline" to="/profile">Edit profile</Link></div>}
          {user?.verificationStatus === 'verified' && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">Your profile has been verified.</div>}

          {applications.filter(a => a.status === 'approved' && a.releaseDetails?.date).map(app => (
            <div key={app._id} className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="text-lg font-bold text-blue-900">Cash assistance release</h3>
              <p className="mt-1 text-sm text-blue-800">Program: {app.program?.title}</p>
              <p className="mt-2 text-lg font-bold text-blue-900">₱{app.releaseDetails.amount}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-blue-800">
                <p><strong>Date:</strong> {new Date(app.releaseDetails.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {app.releaseDetails.timeStart} - {app.releaseDetails.timeEnd}</p>
                <p className="col-span-2"><strong>Location:</strong> {app.releaseDetails.location}</p>
              </div>
              {app.releaseDetails.instructions && <p className="mt-3 text-sm text-blue-800 border-t border-blue-200 pt-3"><strong>Instructions:</strong> {app.releaseDetails.instructions}</p>}
            </div>
          ))}
          {applications.filter(a => a.status === 'approved' && !a.releaseDetails?.date).map(app => (
            <div key={app._id} className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
               Your application for {app.program?.title} has been approved. Release details will appear here once scheduled.
            </div>
          ))}
        </div>

        <section className="mt-8" aria-labelledby="deadline-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="deadline-heading" className="text-lg font-bold text-black">Deadline calendar</h2>
            <Link className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-black underline underline-offset-4" to="/programs">Browse all</Link>
          </div>
          {loading && <p className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600" role="status">Loading program deadlines…</p>}
          {error && <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"><p className="text-sm text-red-700" role="alert">{error}</p><button onClick={loadPrograms} className="min-h-10 rounded-lg bg-red-100 px-4 text-sm font-bold text-red-800 disabled:opacity-50" disabled={loading}>Retry</button></div>}
          {!loading && !error && upcomingPrograms.length === 0 && <p className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">No active program deadlines are available right now.</p>}
          {!loading && !error && upcomingPrograms.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {upcomingPrograms.slice(0, 4).map((program) => (
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3" key={program._id}>
                  <time className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-black text-center text-xs font-semibold leading-4 text-white" dateTime={program.deadline}>
                    {new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(program.deadline))}
                  </time>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-black">{program.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{formatDeadline(program.deadline)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-9" aria-labelledby="discovery-heading">
          <h2 id="discovery-heading" className="text-lg font-bold text-black">Discovery feed</h2>
          <label className="mt-4 block" htmlFor="program-search">
            <span className="sr-only">Search assistance programs</span>
            <input
              className="block min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base text-gray-950 outline-none transition focus:border-black focus:ring-2 focus:ring-black/15"
              id="program-search"
              type="search"
              placeholder="Search programs, categories, or eligibility"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {!loading && !error && discoveryPrograms.length === 0 && <p className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">No active programs match your search.</p>}
          <div className="mt-4 space-y-4">
            {!loading && !error && discoveryPrograms.map((program) => <ProgramCard key={program._id} program={program} />)}
          </div>
        </section>
      </div>
      <StudentBottomNav />
    </main>
  );
}
