import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getUser, verifyUser } from '../../services/userService';

const verificationClasses = {
  incomplete: 'bg-gray-200 text-gray-800',
  pending: 'bg-blue-100 text-blue-800',
  needs_correction: 'bg-red-100 text-red-800',
  verified: 'bg-green-100 text-green-800',
};

const verificationLabel = (status) => ({
  incomplete: 'Incomplete',
  pending: 'Pending',
  needs_correction: 'Needs correction',
  verified: 'Verified',
}[status] || status || 'Incomplete');

const employmentLabels = {
  employed: 'Employed',
  unemployed: 'Unemployed',
  working_abroad: 'Working abroad',
  unknown: 'Unknown',
  deceased: 'Deceased',
  na: 'Not applicable',
};

const formatDate = (value) => value ? new Intl.DateTimeFormat('en-PH', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(value)) : 'Not provided';

const calculateAge = (value) => {
  if (!value) return '';
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : '';
};

const requestError = (error, fallback) => error.response?.data?.message || error.message || fallback;

function DataRow({ label, value }) {
  return <div><dt className="font-semibold text-gray-500">{label}</dt><dd className="mt-1 text-gray-800">{value || 'Not provided'}</dd></div>;
}

function ParentSection({ title, parent }) {
  const data = parent || {};
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-black">{title}</h2>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <DataRow label="Full name" value={data.fullName} />
        <DataRow label="Date of birth" value={data.dob ? `${formatDate(data.dob)} (age ${calculateAge(data.dob)})` : ''} />
        <DataRow label="Contact number" value={data.contact} />
        <DataRow label="Occupation" value={data.occupation} />
        <DataRow label="Employment status" value={data.employmentStatus ? employmentLabels[data.employmentStatus] || data.employmentStatus : ''} />
        <DataRow label="Monthly income range" value={data.monthlyIncomeRange} />
      </dl>
    </section>
  );
}

export default function AdminUserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [action, setAction] = useState({ status: '', remarks: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getUser(id);
      setUser(response.data);
    } catch (requestErrorValue) {
      setUser(null);
      setError(requestError(requestErrorValue, 'Unable to load this beneficiary.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [id]);

  const handleVerify = async () => {
    if (action.status === 'needs_correction' && !String(action.remarks || '').trim()) {
      setError('Please provide a reason for requesting correction.');
      return;
    }
    try {
      setIsProcessing(true);
      setError('');
      setSuccess('');
      await verifyUser(id, action);
      setSuccess('Verification updated.');
      setAction((current) => ({ ...current, remarks: '' }));
      await loadUser();
    } catch (requestErrorValue) {
      setError(requestError(requestErrorValue, 'Unable to update verification.'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <section className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600" role="status">Loading beneficiary…</section>;
  if (!user) return <section className="rounded-xl border border-red-200 bg-white p-6"><p className="text-sm text-red-700" role="alert">{error || 'Beneficiary not found.'}</p><div className="mt-4 flex gap-3"><button onClick={loadUser} className="inline-flex min-h-11 items-center rounded-lg bg-gray-200 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-300" disabled={loading}>Retry</button><Link className="inline-flex min-h-11 items-center rounded-lg bg-black px-4 text-sm font-semibold text-white" to="/admin/users">Back to beneficiaries</Link></div></section>;

  const father = user.father || {};
  const mother = user.mother || {};
  const household = user.household || {};

  return (
    <>
      <Link className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-black underline underline-offset-4" to="/admin/users">Back to beneficiaries</Link>
      <section className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">BENEFICIARY PROFILE</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-black">{user.name || 'Beneficiary'}</h1>
          <p className="mt-2 text-sm text-gray-600">{user.email || ''}</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-bold ${verificationClasses[user.verificationStatus] || verificationClasses.incomplete}`}>{verificationLabel(user.verificationStatus)}</span>
      </section>

      {error && <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {success && <p className="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{success}</p>}

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="verification-heading">
        <h2 className="text-lg font-bold text-black" id="verification-heading">Beneficiary Verification</h2>
        <p className="mt-1 text-sm text-gray-600">This verifies the beneficiary's profile information. It does not approve or deny any application.</p>
        <div className="mt-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          <p><span className="font-semibold text-gray-500">Current profile verification status:</span> <span className="font-semibold text-gray-800">{verificationLabel(user.verificationStatus)}</span></p>
          {user.verificationRemarks && <p><span className="font-semibold text-gray-500">Current administrator remarks:</span> <span className="text-gray-800">{user.verificationRemarks}</span></p>}
        </div>
        <div className="mt-4 space-y-3">
          <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={action.status} onChange={(e) => setAction((current) => ({ ...current, status: e.target.value }))}>
            <option value="">Select action</option>
            <option value="verified">Verify</option>
            <option value="needs_correction">Needs correction</option>
          </select>
          <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Remarks (required for needs correction)" value={action.remarks} onChange={(e) => setAction((current) => ({ ...current, remarks: e.target.value }))} />
          <button className="min-h-10 rounded-lg bg-black px-4 text-sm font-bold text-white" onClick={handleVerify} disabled={isProcessing || !action.status}>Save verification</button>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-black">Personal Information</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <DataRow label="Full name" value={user.name} />
            <DataRow label="Date of birth" value={user.dateOfBirth ? `${formatDate(user.dateOfBirth)} (age ${calculateAge(user.dateOfBirth)})` : ''} />
            <DataRow label="Contact number" value={user.contactNo} />
            <DataRow label="Email" value={user.email} />
            <DataRow label="Address" value={user.address} />
            <DataRow label="Barangay" value={user.barangay} />
          </dl>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-black">Student Information</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <DataRow label="Student ID" value={user.studentID} />
            <DataRow label="Course / program" value={user.course} />
            <DataRow label="Year level" value={user.yearLevel === undefined || user.yearLevel === null || user.yearLevel === '' ? '' : String(user.yearLevel)} />
            <DataRow label="School" value={user.school} />
          </dl>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ParentSection title="Father's Information" parent={father} />
        <ParentSection title="Mother's Information" parent={mother} />
      </div>

      <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-black">Household Information</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <DataRow label="Household member count" value={household.memberCount === undefined || household.memberCount === null || household.memberCount === '' ? '' : String(household.memberCount)} />
          <DataRow label="Dependents / siblings count" value={household.dependentsCount === undefined || household.dependentsCount === null || household.dependentsCount === '' ? '' : String(household.dependentsCount)} />
          <DataRow label="Number currently studying" value={household.currentlyStudyingCount === undefined || household.currentlyStudyingCount === null || household.currentlyStudyingCount === '' ? '' : String(household.currentlyStudyingCount)} />
          <DataRow label="Household monthly income range" value={household.monthlyIncomeRange} />
          <DataRow label="Primary income source" value={household.primaryIncomeSource} />
          <DataRow label="Secondary income source" value={household.secondaryIncomeSource} />
        </dl>
      </section>

      <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-black">Account</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <DataRow label="Role" value={user.role} />
          <DataRow label="Registered" value={formatDate(user.createdAt)} />
        </dl>
      </section>
    </>
  );
}
