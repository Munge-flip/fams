import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import StudentBottomNav from '../../components/StudentBottomNav';
import { createApplication } from '../../services/applicationService';
import { uploadDocument } from '../../services/documentService';
import { getProgramById } from '../../services/programService';

const documentLabels = {
  valid_id: 'Valid ID',
  certificate_of_indigency: 'Certificate of Indigency',
  grades: 'Grades',
  other: 'Other supporting document',
};

const errorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;
const dateValue = (value) => value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not provided';

export default function Apply() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const programId = searchParams.get('program');
  const [program, setProgram] = useState(null);
  const [loadingProgram, setLoadingProgram] = useState(true);
  const [step, setStep] = useState(1);
  const [personalInfo, setPersonalInfo] = useState({ fullName: '', address: '', contactNo: '', birthdate: '' });
  const [documents, setDocuments] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;
    const loadProgram = async () => {
      if (!programId) {
        if (active) { setError('Choose an aid program before starting an application.'); setLoadingProgram(false); }
        return;
      }
      try {
        const foundProgram = await getProgramById(programId);
        if (active) {
          if (!foundProgram) setError('The selected aid program is no longer available.');
          setProgram(foundProgram);
        }
      } catch (requestError) {
        if (active) setError(errorMessage(requestError, 'Unable to load the selected aid program.'));
      } finally {
        if (active) setLoadingProgram(false);
      }
    };
    loadProgram();
    return () => { active = false; };
  }, [programId]);

  const updatePersonalInfo = (event) => {
    const { name, value } = event.target;
    setPersonalInfo((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  };

  const continuePersonalInfo = () => {
    const errors = {};
    Object.entries(personalInfo).forEach(([field, value]) => {
      if (!value.trim()) errors[field] = 'This field is required.';
    });
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setError('');
    setStep(2);
  };

  const addDocument = () => setDocuments((current) => [...current, { id: crypto.randomUUID(), docType: 'valid_id', file: null }]);
  const changeDocument = (id, field, value) => setDocuments((current) => current.map((document) => document.id === id ? { ...document, [field]: value } : document));
  const removeDocument = (id) => setDocuments((current) => current.filter((document) => document.id !== id));

  const saveAndUpload = async () => {
    const invalidDocument = documents.find((document) => !document.file || !document.docType);
    if (invalidDocument) { setError('Choose a document type and file for every upload slot, or remove the empty slot.'); return; }
    const invalidFile = documents.find((document) => document.file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg'].includes(document.file.type));
    if (invalidFile) { setError('Documents must be PDF or JPEG files no larger than 5 MB each.'); return; }

    try {
      setUploading(true); setError(''); setProgress(0);
      let currentApplicationId = applicationId;
      if (!currentApplicationId) {
        const created = await createApplication({ program: programId, personalInfo });
        currentApplicationId = created.data._id;
        setApplicationId(currentApplicationId);
      }
      const savedDocuments = [];
      for (let index = 0; index < documents.length; index += 1) {
        const document = documents[index];
        const uploaded = await uploadDocument({
          applicationId: currentApplicationId,
          docType: document.docType,
          file: document.file,
          onUploadProgress: (event) => {
            if (event.total) setProgress(Math.round(((index + event.loaded / event.total) / documents.length) * 100));
          },
        });
        savedDocuments.push(uploaded.data);
      }
      setUploadedDocuments((current) => [...current, ...savedDocuments]);
      setDocuments([]);
      setProgress(100);
      setStep(3);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to save and upload your application documents.'));
    } finally {
      setUploading(false);
    }
  };

  if (loadingProgram) return <main className="grid min-h-screen place-items-center bg-gray-50 p-5 text-sm text-gray-600" role="status">Loading application form…</main>;
  if (error && !program) return <main className="grid min-h-screen place-items-center bg-gray-50 p-5"><section className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center"><p className="text-sm text-red-700" role="alert">{error}</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-black px-4 text-sm font-semibold text-white" to="/programs">Browse programs</Link></section></main>;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto w-full max-w-2xl px-5 py-7 sm:px-8">
        <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-black underline underline-offset-4" to="/programs">Back to programs</Link>
        <p className="mt-4 text-sm font-semibold tracking-[0.2em] text-gray-600">FAMS APPLICATION</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-black">Apply for assistance</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">{program.title}</p>
        <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Application steps">{['Personal info', 'Documents', 'Review'].map((label, index) => <li className={`rounded-lg px-2 py-2 text-center text-xs font-bold ${step === index + 1 ? 'bg-black text-white' : step > index + 1 ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-400'}`} key={label}>{index + 1}. {label}</li>)}</ol>
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}

        {step === 1 && <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Personal information</h2><p className="mt-2 text-sm text-gray-600">Enter the information that will be included with your application.</p><div className="mt-5 space-y-4">{[['fullName', 'Full name', 'text'], ['address', 'Address', 'text'], ['contactNo', 'Contact number', 'tel'], ['birthdate', 'Birthdate', 'date']].map(([name, label, type]) => <label className="block" key={name}><span className="text-sm font-semibold text-gray-800">{label}</span><input className={`mt-1.5 block min-h-12 w-full rounded-xl border px-3 text-base outline-none focus:border-black focus:ring-2 focus:ring-black/15 ${fieldErrors[name] ? 'border-red-500' : 'border-gray-300'}`} name={name} type={type} value={personalInfo[name]} onChange={updatePersonalInfo} aria-invalid={Boolean(fieldErrors[name])} />{fieldErrors[name] && <span className="mt-1 block text-xs text-red-700">{fieldErrors[name]}</span>}</label>)}</div><button className="mt-6 min-h-12 w-full rounded-xl bg-black px-4 text-sm font-bold text-white" type="button" onClick={continuePersonalInfo}>Continue to documents</button></section>}

        {step === 2 && <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Upload documents</h2><p className="mt-2 text-sm leading-6 text-gray-600">PDF or JPEG only, up to 5 MB per file. Saving this step submits the application because documents must be attached to an application ID.</p><div className="mt-5 space-y-4">{documents.map((document, index) => <div className="rounded-xl border border-gray-200 p-4" key={document.id}><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">Document {index + 1}</p><button className="min-h-10 text-sm font-semibold text-red-700 underline" type="button" onClick={() => removeDocument(document.id)}>Remove</button></div><label className="mt-3 block text-sm font-semibold">Document type<select className="mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3" value={document.docType} onChange={(event) => changeDocument(document.id, 'docType', event.target.value)}>{Object.entries(documentLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="mt-3 block text-sm font-semibold">File<input className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold" type="file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" onChange={(event) => changeDocument(document.id, 'file', event.target.files?.[0] || null)} /></label>{document.file && <p className="mt-2 text-xs text-gray-600">Selected: {document.file.name} ({Math.ceil(document.file.size / 1024)} KB)</p>}</div>)}</div><button className="mt-4 min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold" type="button" onClick={addDocument} disabled={uploading}>Add a document</button>{uploading && <div className="mt-4" role="status"><p className="text-sm font-semibold">Uploading… {progress}%</p><progress className="mt-2 h-2 w-full accent-black" max="100" value={progress}> {progress}% </progress></div>}<div className="mt-6 flex gap-3"><button className="min-h-12 flex-1 rounded-xl border border-gray-300 px-4 text-sm font-bold" type="button" onClick={() => setStep(1)} disabled={uploading || Boolean(applicationId)}>Back</button><button className="min-h-12 flex-[2] rounded-xl bg-black px-4 text-sm font-bold text-white disabled:bg-gray-400" type="button" onClick={saveAndUpload} disabled={uploading}>{uploading ? 'Saving…' : 'Save and review'}</button></div>{applicationId && <p className="mt-3 text-xs leading-5 text-gray-600">Your application is already submitted. You can add documents here, but the backend does not support editing personal information after submission.</p>}</section>}

        {step === 3 && <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Review your application</h2><div className="mt-5 space-y-5 text-sm"><div><p className="font-semibold text-gray-500">AID PROGRAM</p><p className="mt-1 font-bold text-black">{program.title}</p></div><div><p className="font-semibold text-gray-500">PERSONAL INFORMATION</p><dl className="mt-2 space-y-1 text-gray-700"><div><dt className="inline font-semibold">Name: </dt><dd className="inline">{personalInfo.fullName}</dd></div><div><dt className="inline font-semibold">Address: </dt><dd className="inline">{personalInfo.address}</dd></div><div><dt className="inline font-semibold">Contact: </dt><dd className="inline">{personalInfo.contactNo}</dd></div><div><dt className="inline font-semibold">Birthdate: </dt><dd className="inline">{dateValue(personalInfo.birthdate)}</dd></div></dl></div><div><p className="font-semibold text-gray-500">UPLOADED DOCUMENTS</p>{uploadedDocuments.length ? <ul className="mt-2 space-y-2">{uploadedDocuments.map((document) => <li className="rounded-lg bg-green-50 px-3 py-2 text-green-800" key={document._id}>Uploaded successfully: {documentLabels[document.docType] || document.docType}</li>)}</ul> : <p className="mt-2 text-gray-600">No supporting documents were uploaded.</p>}</div></div><div className="mt-6 flex gap-3"><button className="min-h-12 flex-1 rounded-xl border border-gray-300 px-4 text-sm font-bold" type="button" onClick={() => setStep(2)}>Back</button><button className="min-h-12 flex-[2] rounded-xl bg-black px-4 text-sm font-bold text-white" type="button" onClick={() => navigate(`/applications/${applicationId}`, { replace: true })}>Complete application</button></div></section>}
      </div>
      <StudentBottomNav />
    </main>
  );
}
