import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import StudentBottomNav from '../../components/StudentBottomNav';
import { useAuth } from '../../context/AuthContext';
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
  const { user } = useAuth();
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

  const loadProgram = async () => {
    if (!programId) {
      setError('Choose an aid program before starting an application.');
      setLoadingProgram(false);
      return;
    }
    setLoadingProgram(true);
    setError('');
    try {
      const result = await getProgramById(programId);
      if (!result || !result.data) {
        setError('The selected aid program is no longer available.');
      } else {
        setProgram(result.data);
      }
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load the selected aid program.'));
    } finally {
      setLoadingProgram(false);
    }
  };

  useEffect(() => {
    loadProgram();
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

  const addDocumentType = (docType) => {
    if (!docType) return;
    setDocuments((current) => [...current, { id: crypto.randomUUID(), docType, file: null, status: 'pending' }]);
  };
  const addFileToType = (docType) => {
    setDocuments((current) => [...current, { id: crypto.randomUUID(), docType, file: null, status: 'pending' }]);
  };
  const removeDocumentType = (docType) => {
    setDocuments((current) => current.filter((document) => document.docType !== docType));
  };
  const changeDocument = (id, field, value) => {
    if (field === 'file' && value) {
      const currentDoc = documents.find((d) => d.id === id);
      if (currentDoc) {
        const isDuplicate = documents.some((d) => d.docType === currentDoc.docType && d.id !== id && d.file?.name === value.name && d.file?.size === value.size);
        if (isDuplicate) {
          setError(`The file "${value.name}" is already selected for this document type.`);
          return;
        }
      }
    }
    setError('');
    setDocuments((current) => current.map((document) => document.id === id ? { ...document, [field]: value } : document));
  };
  const removeDocument = (id) => setDocuments((current) => current.filter((document) => document.id !== id));
  const saveAndUpload = async () => {
    const pendingDocs = documents.filter((doc) => doc.status !== 'success');
    const invalidDocument = pendingDocs.find((document) => !document.file || !document.docType);
    if (invalidDocument) { setError('Choose a document type and file for every upload slot, or remove the empty slot.'); return; }
    const invalidFile = pendingDocs.find((document) => document.file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg'].includes(document.file.type));
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
      let successCount = documents.length - pendingDocs.length;
      for (let index = 0; index < documents.length; index += 1) {
        const document = documents[index];
        if (document.status === 'success') continue;

        try {
          setDocuments((current) => current.map((doc) => doc.id === document.id ? { ...doc, status: 'uploading' } : doc));
          const uploaded = await uploadDocument({
            applicationId: currentApplicationId,
            docType: document.docType,
            file: document.file,
            onUploadProgress: (event) => {
              if (event.total) setProgress(Math.round((((successCount) + event.loaded / event.total) / documents.length) * 100));
            },
          });
          savedDocuments.push(uploaded.data);
          setDocuments((current) => current.map((doc) => doc.id === document.id ? { ...doc, status: 'success' } : doc));
          successCount += 1;
        } catch (uploadError) {
          setDocuments((current) => current.map((doc) => doc.id === document.id ? { ...doc, status: 'error' } : doc));
          throw uploadError;
        }
      }
      setUploadedDocuments((current) => [...current, ...savedDocuments]);
      setDocuments([]);
      setProgress(100);
      setStep(3);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to save and upload your application documents. Please retry.'));
    } finally {
      setUploading(false);
    }
  };

  if (user?.verificationStatus !== 'verified') {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-50 p-5 pb-24">
        <section className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-red-700">Verification required</p>
          <p className="mt-3 text-sm leading-6 text-gray-700">Your profile must be verified before you can apply for financial assistance.</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-black px-4 text-sm font-semibold text-white" to="/verification-profile">Go to verification profile</Link>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gray-200 px-4 text-sm font-semibold text-gray-800" to="/programs">Browse programs</Link>
          </div>
        </section>
        <StudentBottomNav />
      </main>
    );
  }

  if (loadingProgram) return <main className="grid min-h-screen place-items-center bg-gray-50 p-5 text-sm text-gray-600" role="status">Loading application form…</main>;
  if (error && !program) return <main className="grid min-h-screen place-items-center bg-gray-50 p-5"><section className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center"><p className="text-sm text-red-700" role="alert">{error}</p><div className="mt-4 flex justify-center gap-3"><button onClick={loadProgram} className="inline-flex min-h-11 items-center rounded-lg bg-gray-200 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-300">Retry</button><Link className="inline-flex min-h-11 items-center rounded-lg bg-black px-4 text-sm font-semibold text-white" to="/programs">Browse programs</Link></div></section></main>;

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

        {step === 2 && (() => {
          const usedDocTypes = [...new Set(documents.map(d => d.docType))];
          const availableDocTypes = Object.entries(documentLabels).filter(([value]) => !usedDocTypes.includes(value));
          return (
            <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">Upload documents</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">PDF or JPEG only, up to 5 MB per file. Saving this step submits the application because documents must be attached to an application ID.</p>
              <div className="mt-5 space-y-6">
                {usedDocTypes.map((docType) => {
                  const typeDocs = documents.filter((d) => d.docType === docType);
                  return (
                    <div key={docType} className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{documentLabels[docType]}</h3>
                          <p className="mt-1 text-xs text-gray-500">Multiple files can be added for multi-page documents or front/back IDs.</p>
                        </div>
                        <button className="min-h-8 text-sm font-semibold text-red-700 underline disabled:text-gray-400" type="button" onClick={() => removeDocumentType(docType)} disabled={uploading || typeDocs.some((d) => d.status === 'success' || d.status === 'uploading')}>
                          Remove type
                        </button>
                      </div>
                      <div className="mt-4 space-y-3">
                        {typeDocs.map((document, index) => {
                          const isSuccess = document.status === 'success';
                          const isUploading = document.status === 'uploading' || uploading;
                          return (
                            <div className={`rounded-xl border p-4 ${document.status === 'error' ? 'border-red-300 bg-red-50' : isSuccess ? 'border-green-300 bg-green-50' : 'border-gray-200'}`} key={document.id}>
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-gray-700">File {index + 1} {isSuccess && <span className="text-green-700">(Uploaded)</span>} {document.status === 'error' && <span className="text-red-700">(Failed)</span>}</p>
                                <button className="min-h-8 text-sm font-semibold text-red-700 underline disabled:text-gray-400" type="button" onClick={() => removeDocument(document.id)} disabled={isUploading || isSuccess}>Remove</button>
                              </div>
                              <label className="mt-3 block text-sm font-semibold">Choose file<input className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold disabled:opacity-50" type="file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" onChange={(event) => changeDocument(document.id, 'file', event.target.files?.[0] || null)} disabled={isUploading || isSuccess} /></label>
                              {document.file && <p className="mt-2 text-xs text-gray-600">Selected: {document.file.name} ({Math.ceil(document.file.size / 1024)} KB)</p>}
                            </div>
                          );
                        })}
                      </div>
                      <button className="mt-4 min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold disabled:text-gray-400" type="button" onClick={() => addFileToType(docType)} disabled={uploading}>
                        Add another file to this type
                      </button>
                    </div>
                  );
                })}
              </div>
              {availableDocTypes.length > 0 && (
                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <label className="block text-sm font-semibold text-gray-900">
                    Add another document type
                    <select className="mt-2 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3" value="" onChange={(event) => addDocumentType(event.target.value)} disabled={uploading}>
                      <option value="" disabled>Select a document type...</option>
                      {availableDocTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                    </select>
                  </label>
                </div>
              )}
              {uploading && <div className="mt-6" role="status"><p className="text-sm font-semibold">Uploading… {progress}%</p><progress className="mt-2 h-2 w-full accent-black" max="100" value={progress}> {progress}% </progress></div>}
              <div className="mt-6 flex gap-3"><button className="min-h-12 flex-1 rounded-xl border border-gray-300 px-4 text-sm font-bold disabled:text-gray-400" type="button" onClick={() => setStep(1)} disabled={uploading || Boolean(applicationId)}>Back</button><button className="min-h-12 flex-[2] rounded-xl bg-black px-4 text-sm font-bold text-white disabled:bg-gray-400" type="button" onClick={saveAndUpload} disabled={uploading}>{uploading ? 'Saving…' : documents.some((d) => d.status === 'error') ? 'Retry failed' : 'Save and review'}</button></div>
              {applicationId && <p className="mt-4 text-xs leading-5 text-gray-600">Your application is already submitted. You can add documents here, but the backend does not support editing personal information after submission.</p>}
            </section>
          );
        })()}

        {step === 3 && (() => {
          const uploadedTypes = [...new Set(uploadedDocuments.map(d => d.docType))];
          return (
            <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">Review your application</h2>
              <div className="mt-5 space-y-5 text-sm">
                <div><p className="font-semibold text-gray-500">AID PROGRAM</p><p className="mt-1 font-bold text-black">{program.title}</p></div>
                <div><p className="font-semibold text-gray-500">PERSONAL INFORMATION</p><dl className="mt-2 space-y-1 text-gray-700"><div><dt className="inline font-semibold">Name: </dt><dd className="inline">{personalInfo.fullName}</dd></div><div><dt className="inline font-semibold">Address: </dt><dd className="inline">{personalInfo.address}</dd></div><div><dt className="inline font-semibold">Contact: </dt><dd className="inline">{personalInfo.contactNo}</dd></div><div><dt className="inline font-semibold">Birthdate: </dt><dd className="inline">{dateValue(personalInfo.birthdate)}</dd></div></dl></div>
                <div>
                  <p className="font-semibold text-gray-500">UPLOADED DOCUMENTS</p>
                  {uploadedTypes.length ? (
                    <div className="mt-2 space-y-3">
                      {uploadedTypes.map((type) => (
                        <div key={type} className="rounded-lg bg-green-50 px-3 py-3 text-green-900 text-sm">
                          <p className="font-bold">{documentLabels[type] || type}</p>
                          <p className="mt-1 text-xs opacity-90">{uploadedDocuments.filter((d) => d.docType === type).length} file(s) uploaded</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="mt-2 text-gray-600">No supporting documents were uploaded.</p>}
                </div>
              </div>
              <div className="mt-6 flex gap-3"><button className="min-h-12 flex-1 rounded-xl border border-gray-300 px-4 text-sm font-bold" type="button" onClick={() => setStep(2)}>Back</button><button className="min-h-12 flex-[2] rounded-xl bg-black px-4 text-sm font-bold text-white" type="button" onClick={() => navigate(`/applications/${applicationId}`, { replace: true })}>Complete application</button></div>
            </section>
          );
        })()}
      </div>
      <StudentBottomNav />
    </main>
  );
}
