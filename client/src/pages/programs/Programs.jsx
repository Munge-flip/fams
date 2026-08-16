import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProgramCard from '../../components/ProgramCard';
import StudentBottomNav from '../../components/StudentBottomNav';
import { getPrograms } from '../../services/programService';

const byDeadline = (first, second) => new Date(first.deadline) - new Date(second.deadline);

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadPrograms = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getPrograms();
        if (active) setPrograms(response.data);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Unable to load available assistance programs.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPrograms();
    return () => { active = false; };
  }, []);

  const filteredPrograms = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...programs]
      .sort(byDeadline)
      .filter((program) => !term || [program.title, program.description, program.eligibility, program.category]
        .some((value) => value?.toLowerCase().includes(term)));
  }, [programs, search]);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto w-full max-w-3xl px-5 py-7 sm:px-8">
        <Link className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-black underline underline-offset-4" to="/dashboard">Back to dashboard</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-black">Aid programs</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">Browse all financial assistance programs that are currently open.</p>

        <label className="mt-6 block" htmlFor="all-program-search">
          <span className="sr-only">Search aid programs</span>
          <input
            className="block min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base text-gray-950 outline-none transition focus:border-black focus:ring-2 focus:ring-black/15"
            id="all-program-search"
            type="search"
            placeholder="Search programs, categories, or eligibility"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        {loading && <p className="mt-5 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600" role="status">Loading aid programs…</p>}
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
        {!loading && !error && filteredPrograms.length === 0 && <p className="mt-5 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">No active programs match your search.</p>}
        <div className="mt-5 space-y-4">
          {!loading && !error && filteredPrograms.map((program) => <ProgramCard key={program._id} program={program} />)}
        </div>
      </div>
      <StudentBottomNav />
    </main>
  );
}
