import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApplication, updateApplicationStatus, updateReleaseAmount } from '../../services/applicationService';

const documentLabels = {
  valid_id: 'Valid ID',
  certificate_of_indigency: 'Certificate of Indigency',
  grades: 'Grades',
  other: 'Other supporting document',
};

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

const transitions = {
  submitted: [{ status: 'under_review', label: 'Mark under review' }],
  under_review: [{ status: 'approved', label: 'Approve' }, { status: 'denied', label: 'Deny' }],
  approved: [{ status: 'cash_released', label: 'Mark cash released' }],
  denied: [],
  cash_released: [],
};

const formatDate = (value) => value ? new Intl.DateTimeFormat('en-PH', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(value)) : 'Not available';

const requestError = (error, fallback) => error.response?.data?.message || error.message || fallback;

function DataRow({ label, value }) {
  return <div><dt className="font-semibold text-gray-500">{label}</dt><dd className="mt-1 text-gray-800">{value || 'Not available'}</dd></div>;
}

export default function AdminApplicationDetail() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [changingStatus, setChangingStatus] = useState('');
  const [releaseAmount, setReleaseAmount] = useState('');
  const [savingAmount, setSavingAmount] = useState(false);

  useEffect(() => {
    if (application) {
      const currentAmount = application.releaseDetails?.amount;
      setReleaseAmount(currentAmount === undefined || currentAmount === null ? '' : String(currentAmount));
    }
  }, [application]);

  const handleReleaseAmount = async () => {
    const amount = Number(releaseAmount);
    if (!releaseAmount.trim() || !Number.isFinite(amount) || amount < 0) {
      setError('Release amount must be a non-negative number.');
      return;
    }
    try {
      setSavingAmount(true);
      setError('');
      setSuccess('');
      const response = await updateReleaseAmount(id, amount);
      setApplication(response.data);
      setReleaseAmount(String(response.data.releaseDetails?.amount ?? ''));
      setSuccess('Release amount updated.');
    } catch (requestErrorValue) {
      setError(requestError(requestErrorValue, 'Unable to update the release amount.'));
    } finally {
      setSavingAmount(false);
    }
  };

  const loadApplication = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getApplication(id);
      setApplication(response.data);
      setRemarks(response.data.remarks || '');
    } catch (requestErrorValue) {
      setApplication(null);
      setError(requestError(requestErrorValue, 'Unable to load this application.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplication();
  }, [id]);

  const saveRemarks = async () => {
    if (!application) return;

    try {
      setSavingRemarks(true);
      setError('');
      setSuccess('');
      const response = await updateApplicationStatus(application._id, {
        status: application.status,
        remarks,
      });
      setApplication(response.data);
      setRemarks(response.data.remarks || '');
      setSuccess('Remarks saved successfully.');
    } catch (requestErrorValue) {
      setError(requestError(requestErrorValue, 'Unable to save remarks.'));
    } finally {
      setSavingRemarks(false);
    }
  };

  const changeStatus = async (nextStatus, label) => {
    if (!application) return;
    if (!window.confirm(`${label} for this application?`)) return;

    try {
      setChangingStatus(nextStatus);
      setError('');
      setSuccess('');
      const response = await updateApplicationStatus(application._id, {
        status: nextStatus,
        remarks,
      });
      setApplication(response.data);
      setRemarks(response.data.remarks || '');
      setSuccess(`Application status updated to ${statusLabel(nextStatus)}.`);
    } catch (requestErrorValue) {
      setError(requestError(requestErrorValue, 'Unable to update this application status.'));
    } finally {
      setChangingStatus('');
    }
  };

  if (loading) return <section className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600" role="status">Loading application…</section>;
  if (!application) return <section className="rounded-xl border border-red-200 bg-white p-6"><p className="text-sm text-red-700" role="alert">{error || 'Application not found.'}</p><div className="mt-4 flex gap-3"><button onClick={loadApplication} className="inline-flex min-h-11 items-center rounded-lg bg-gray-200 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-300" disabled={loading}>Retry</button><Link className="inline-flex min-h-11 items-center rounded-lg bg-black px-4 text-sm font-semibold text-white" to="/admin/applications">Back to applications</Link></div></section>;

  const applicant = application.applicant || {};
  const personalInfo = application.personalInfo || {};
  const program = application.program || {};
  const availableTransitions = transitions[application.status] || [];
  const isSaving = savingRemarks || Boolean(changingStatus);

  return (
    <>
      <Link className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-black underline underline-offset-4" to="/admin/applications">Back to applications</Link>
      <section className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">APPLICATION REVIEW</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-black">{program.title || 'Application detail'}</h1>
          <p className="mt-2 text-sm text-gray-600">Review applicant records, documents, and status.</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-bold ${statusClasses[application.status] || statusClasses.submitted}`}>{statusLabel(application.status)}</span>
      </section>

      {error && <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {success && <p className="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{success}</p>}

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="status-management-heading">
        <h2 className="text-lg font-bold text-black" id="status-management-heading">Status management</h2>
        <p className="mt-1 text-sm text-gray-600">Only valid next steps are available for this application.</p>
        {availableTransitions.length > 0 ? <div className="mt-4 flex flex-wrap gap-3">{availableTransitions.map((transition) => <button className={`min-h-11 rounded-lg px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${transition.status === 'denied' ? 'bg-red-700' : 'bg-black'}`} key={transition.status} type="button" onClick={() => changeStatus(transition.status, transition.label)} disabled={isSaving}>{changingStatus === transition.status ? 'Saving…' : transition.label}</button>)}</div> : <p className="mt-4 rounded-lg bg-gray-100 p-3 text-sm text-gray-700">This status is final. No further status transitions are available.</p>}
      </section>
      <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="release-amount-heading">
        <h2 className="text-lg font-bold text-black" id="release-amount-heading">Application release amount</h2>
        <p className="mt-1 text-sm text-gray-600">Set the cash assistance amount specific to this application. This does not schedule the release or change the application status.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="release-amount-input">Release amount</label>
          <input className="block min-h-11 w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10" id="release-amount-input" type="number" min="0" step="0.01" placeholder="Amount" value={releaseAmount} onChange={(e) => setReleaseAmount(e.target.value)} disabled={savingAmount} />
          <button className="min-h-11 rounded-lg bg-black px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={handleReleaseAmount} disabled={savingAmount}>{savingAmount ? 'Saving…' : 'Save amount'}</button>
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="remarks-heading">
        <h2 className="text-lg font-bold text-black" id="remarks-heading">Administrator remarks</h2>
        <p className="mt-1 text-sm text-gray-600">Remarks are visible to the applicant. Saving uses the current application status as required by the API.</p>
        <label className="mt-4 block" htmlFor="admin-remarks"><span className="sr-only">Administrator remarks</span><textarea className="block min-h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10" id="admin-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} disabled={isSaving} /></label>
        <button className="mt-4 min-h-11 rounded-lg bg-black px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={saveRemarks} disabled={isSaving}>{savingRemarks ? 'Saving remarks…' : 'Save remarks'}</button>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-black">Applicant</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><DataRow label="Name" value={applicant.name} /><DataRow label="Email" value={applicant.email} /><DataRow label="Contact number" value={applicant.contactNo} /><DataRow label="Student ID" value={applicant.studentID} /><DataRow label="Barangay" value={applicant.barangay} /></dl></section>
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-black">Application</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><DataRow label="Submitted" value={formatDate(application.submittedAt)} /><DataRow label="Last updated" value={formatDate(application.updatedAt)} /><DataRow label="Current status" value={statusLabel(application.status)} /></dl></section>
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-black">Personal information</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><DataRow label="Full name" value={personalInfo.fullName} /><DataRow label="Contact number" value={personalInfo.contactNo} /><DataRow label="Address" value={personalInfo.address} /><DataRow label="Birthdate" value={formatDate(personalInfo.birthdate)} /></dl></section>
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-black">Aid program</h2><dl className="mt-4 grid gap-4 text-sm"><DataRow label="Title" value={program.title} /><DataRow label="Description" value={program.description} /><DataRow label="Eligibility" value={program.eligibility} /><div className="grid gap-4 sm:grid-cols-2"><DataRow label="Category" value={program.category} /><DataRow label="Deadline" value={formatDate(program.deadline)} /><DataRow label="Slots" value={program.slots === undefined || program.slots === null ? '' : String(program.slots)} /><DataRow label="Program status" value={program.status} /></div>{program.releaseDetails?.date && <div className="mt-4 grid gap-4 rounded-lg bg-gray-50 p-3 sm:grid-cols-2"><DataRow label="Program release date" value={formatDate(program.releaseDetails.date)} /><DataRow label="Program release time" value={`${program.releaseDetails.timeStart} - ${program.releaseDetails.timeEnd}`} /><DataRow label="Program release location" value={program.releaseDetails.location} />{program.releaseDetails.instructions && <DataRow label="Release instructions" value={program.releaseDetails.instructions} />}</div>}</dl></section>
      </div>

      <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="documents-heading">
        <h2 className="text-lg font-bold text-black" id="documents-heading">Uploaded documents</h2>
        {application.documents?.length ? <ul className="mt-4 divide-y divide-gray-100 border-y border-gray-100">{application.documents.map((document) => <li className="flex flex-wrap items-center justify-between gap-4 py-4" key={document._id}><div><p className="text-sm font-semibold text-gray-900">{documentLabels[document.docType] || document.docType}</p><p className="mt-1 text-xs text-gray-600">Uploaded {formatDate(document.uploadedAt)}</p></div>{document.fileURL && <a className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-800" href={document.fileURL} target="_blank" rel="noreferrer">Open file</a>}</li>)}</ul> : <p className="mt-3 text-sm text-gray-600">No documents were uploaded with this application.</p>}
      </section>
    </>
  );
}
