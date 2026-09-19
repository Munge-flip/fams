import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { updateApplicationStatus } from '../../services/applicationService';
import { getProgramBeneficiaries } from '../../services/programService';

const statusClasses = {
  approved: 'bg-green-100 text-green-800',
  cash_released: 'bg-emerald-100 text-emerald-900',
};

const statusLabels = {
  approved: 'Accepted',
  cash_released: 'Released',
};

const formatDate = (value) => value ? new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(value)) : 'Not available';

const requestError = (error, fallback) => (error.response?.status >= 500 ? fallback : error.response?.data?.message || fallback);

export default function AdminProgramBeneficiaries() {
  const { programId } = useParams();
  const [program, setProgram] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [actionId, setActionId] = useState('');

  const loadBeneficiaries = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getProgramBeneficiaries(programId);
      setProgram(response.data.program);
      setBeneficiaries(response.data.beneficiaries);
    } catch (requestErrorValue) {
      setProgram(null);
      setBeneficiaries([]);
      setError(requestError(requestErrorValue, 'Unable to load beneficiaries. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBeneficiaries();
  }, [programId]);

  const changeStatus = async (application, status) => {
    const name = application.applicant?.name || 'this beneficiary';
    const action = status === 'cash_released' ? 'Mark as released' : 'Undo the release for';
    if (!window.confirm(`${action} ${name}?`)) return;

    try {
      setActionId(application._id);
      setError('');
      setMessage('');
      await updateApplicationStatus(application._id, { status });
      setMessage(status === 'cash_released' ? `${name} has been marked as released.` : `The release for ${name} has been undone.`);
      await loadBeneficiaries();
    } catch (requestErrorValue) {
      setError(requestError(requestErrorValue, 'Unable to update this beneficiary. Please try again.'));
    } finally {
      setActionId('');
    }
  };

  const acceptedCount = beneficiaries.filter((application) => application.status === 'approved').length;
  const releasedCount = beneficiaries.filter((application) => application.status === 'cash_released').length;

  if (loading) {
    return <section className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600" role="status">Loading beneficiaries…</section>;
  }

  if (!program) {
    return (
      <section className="rounded-xl border border-red-200 bg-white p-6">
        <p className="text-sm text-red-700" role="alert">{error || 'Aid program not found.'}</p>
        <div className="mt-4 flex gap-3">
          <button className="inline-flex min-h-11 items-center rounded-lg bg-gray-200 px-4 text-sm font-semibold text-gray-800" type="button" onClick={loadBeneficiaries}>Retry</button>
          <Link className="inline-flex min-h-11 items-center rounded-lg bg-black px-4 text-sm font-semibold text-white" to="/admin/programs">Back to programs</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <Link className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-black underline underline-offset-4" to="/admin/programs">Back to programs</Link>

      <section className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">ACCEPTED BENEFICIARIES</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-black">{program.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Beneficiaries accepted for this program. Mark each one as released once they receive their assistance.</p>
        </div>
        <button className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={loadBeneficiaries} disabled={loading}>Refresh</button>
      </section>

      {error && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert"><span>{error}</span><button className="min-h-10 rounded-lg border border-red-300 px-3 font-semibold" type="button" onClick={loadBeneficiaries}>Retry</button></div>}
      {message && <p className="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{message}</p>}

      <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby="beneficiary-list-heading">
        <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-black" id="beneficiary-list-heading">Accepted beneficiaries</h2>
          <p className="mt-1 text-sm text-gray-600">{acceptedCount} waiting for release, {releasedCount} already released. List is ordered by application date.</p>
        </div>

        {beneficiaries.length === 0 ? (
          <p className="p-6 text-sm text-gray-600">No beneficiaries have been accepted for this program yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold sm:px-6" scope="col">Beneficiary</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Student ID</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Barangay</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Accepted</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Status</th>
                  <th className="px-5 py-3 font-semibold sm:px-6" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {beneficiaries.map((application) => {
                  const busy = actionId === application._id;
                  const released = application.status === 'cash_released';
                  return (
                    <tr className="bg-white" key={application._id}>
                      <td className="px-5 py-4 sm:px-6">
                        <p className="font-semibold text-black">{application.applicant?.name || 'Beneficiary unavailable'}</p>
                        <p className="mt-1 text-xs text-gray-500">{application.applicant?.email || 'Email not available'}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{application.applicant?.studentID || '—'}</td>
                      <td className="px-5 py-4 text-gray-700">{application.applicant?.barangay || '—'}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-700">{formatDate(application.submittedAt)}</td>
                      <td className="px-5 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[application.status] || statusClasses.approved}`}>{statusLabels[application.status] || application.status}</span></td>
                      <td className="px-5 py-4 sm:px-6">
                        <button
                          className={`min-h-9 rounded-lg border px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 ${released ? 'border-gray-300 text-gray-800' : 'border-green-300 text-green-800'}`}
                          type="button"
                          onClick={() => changeStatus(application, released ? 'approved' : 'cash_released')}
                          disabled={busy}
                        >
                          {busy ? 'Saving…' : released ? 'Undo' : 'Mark released'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
