import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ApplicationStatus, { StatusBadge } from '../../components/ApplicationStatus';
import StudentBottomNav from '../../components/StudentBottomNav';
import { cancelApplication, getApplication } from '../../services/applicationService';

const documentLabels = { valid_id: 'Valid ID', certificate_of_indigency: 'Certificate of Indigency', grades: 'Grades', other: 'Other supporting document' };
const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not available';

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getApplication(id);
      setApplication(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load this application.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);


  const handleCancel = async () => {
    if (!window.confirm('Cancel this submitted application? This cannot be undone.')) return;
    try {
      setCancelling(true); setError('');
      await cancelApplication(id);
      navigate('/applications', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel this application.');
    } finally { setCancelling(false); }
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-gray-50 p-5 text-sm text-gray-600" role="status">Loading application…</main>;
  if (!application) return <main className="grid min-h-screen place-items-center bg-gray-50 p-5"><section className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center"><p className="text-sm text-red-700" role="alert">{error || 'Application not found.'}</p><div className="mt-4 flex justify-center gap-3"><button onClick={load} className="inline-flex min-h-11 items-center rounded-lg bg-gray-200 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-300" disabled={loading}>Retry</button><Link className="inline-flex min-h-11 items-center rounded-lg bg-black px-4 text-sm font-semibold text-white" to="/applications">Back to applications</Link></div></section></main>;
  const personalInfo = application.personalInfo || {};
  return <main className="min-h-screen bg-gray-50 pb-24"><div className="mx-auto w-full max-w-2xl px-5 py-7 sm:px-8"><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-black underline underline-offset-4" to="/applications">Back to applications</Link><div className="mt-4 flex items-start justify-between gap-4"><div><p className="text-sm font-semibold tracking-[0.2em] text-gray-600">APPLICATION STATUS</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{application.program?.title || 'Aid program'}</h1>{application.program?.status === 'closed' && <span className="mt-2 inline-flex rounded-full bg-gray-200 px-2.5 py-1 text-xs font-bold text-gray-800">Program closed</span>}</div><StatusBadge status={application.status} /></div>{error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}<section className="mt-6 rounded-2xl border border-g…ray-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Current status</h2><ApplicationStatus status={application.status} />{application.status === 'denied' && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{application.remarks ? `Administrator remarks: ${application.remarks}` : 'No administrator remarks were provided.'}</p>}{['approved', 'cash_released'].includes(application.status) && <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">Your application is {application.status === 'cash_released' ? 'marked as cash released.' : 'approved.'}{application.remarks ? ` Remarks: ${application.remarks}` : ''}</p>}<p className="mt-5 text-sm text-gray-600">Submitted on {formatDate(application.submittedAt)}</p>{application.status === 'submitted' && <button className="mt-5 min-h-11 rounded-lg border border-red-300 px-4 text-sm font-bold text-red-700 disabled:opacity-60" type="button" onClick={handleCancel} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Cancel application'}</button>}</section>

 {['approved', 'cash_released'].includes(application.status) && (
   <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
     <h2 className="text-lg font-bold text-blue-900">{application.status === 'cash_released' ? 'Cash assistance released' : 'Cash assistance scheduled'}</h2>
     {(() => {
       const schedule = application.releaseDetails?.date ? application.releaseDetails : application.program?.releaseDetails;
       if (schedule?.date) {
         return (
           <div className="mt-4 space-y-3 text-sm text-blue-900">
             {Number(application.releaseDetails?.amount) > 0 && <p><strong>Amount:</strong> ₱{application.releaseDetails.amount}</p>}
             <p><strong>Date:</strong> {new Date(schedule.date).toLocaleDateString()}</p>
             <p><strong>Time:</strong> {schedule.timeStart} - {schedule.timeEnd}</p>
             <p><strong>Location:</strong> {schedule.location}</p>
             {schedule.instructions && <p><strong>Instructions:</strong> {schedule.instructions}</p>}
           </div>
         );
       }
       return <p className="mt-3 text-sm text-blue-800">Your application is approved, but release details are not yet available.</p>;
     })()}
   </section>
 )}

<section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Personal information</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="font-semibold text-gray-500">Full name</dt><dd className="mt-1 text-gray-800">{personalInfo.fullName || 'Not provided'}</dd></div><div><dt className="font-semibold text-gray-500">Address</dt><dd className="mt-1 text-gray-800">{personalInfo.address || 'Not provided'}</dd></div><div><dt className="font-semibold text-gray-500">Contact number</dt><dd className="mt-1 text-gray-800">{personalInfo.contactNo || 'Not provided'}</dd></div><div><dt className="font-semibold text-gray-500">Birthdate</dt><dd className="mt-1 text-gray-800">{formatDate(personalInfo.birthdate)}</dd></div></dl></section><section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Uploaded documents</h2>{application.documents?.length ? <ul className="mt-4 space-y-3">{application.documents.map((document) => <li className="flex items-center justify-between gap-3 rounded-xl bg-green-50 p-3" key={document._id}><div><p className="text-sm font-semibold text-green-900">{documentLabels[document.docType] || document.docType}</p><p className="mt-1 text-xs text-green-800">Uploaded successfully on {formatDate(document.uploadedAt)}</p></div>{document.fileURL && <a className="min-h-10 rounded-lg border border-green-300 px-3 py-2 text-sm font-semibold text-green-900" href={document.fileURL} target="_blank" rel="noreferrer">Open file</a>}</li>)}</ul> : <p className="mt-3 text-sm text-gray-600">No documents were uploaded with this application.</p>}</section></div><StudentBottomNav /></main>;
}
