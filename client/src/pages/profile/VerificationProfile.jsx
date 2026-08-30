import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentBottomNav from '../../components/StudentBottomNav';
import { useAuth } from '../../context/AuthContext';
import { submitVerificationProfile } from '../../services/authService';

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'working_abroad', label: 'Working abroad' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'na', label: 'Not applicable' },
];

const EMPLOYMENT_STATUSES = EMPLOYMENT_OPTIONS.map((option) => option.value);

const INCOME_RANGES = [
  'Below ₱10,000',
  '₱10,000–₱19,999',
  '₱20,000–₱29,999',
  '₱30,000–₱39,999',
  '₱40,000 or more',
];

const PARENT_KEYS = ['fullName', 'dob', 'contact', 'occupation', 'employmentStatus', 'monthlyIncomeRange'];

const emptyParent = () => ({
  fullName: '',
  dob: '',
  contact: '',
  occupation: '',
  employmentStatus: '',
  monthlyIncomeRange: '',
});

const emptyHousehold = () => ({
  memberCount: '',
  dependentsCount: '',
  currentlyStudyingCount: '',
  monthlyIncomeRange: '',
  primaryIncomeSource: '',
  secondaryIncomeSource: '',
});

const requiredFields = ['name', 'dateOfBirth', 'contactNo', 'address', 'barangay', 'studentID', 'course', 'yearLevel', 'school'];

const contactPattern = /^[+]?[\d\s()-]{7,15}$/;

const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const isNonNegativeInteger = (value) => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0);

const Section = ({ title, children }) => (
  <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
    <h2 className="text-lg font-bold text-black">{title}</h2>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
  </section>
);

const Field = ({ label, required, children }) => (
  <div>
    <label className="mb-1 block text-sm font-semibold text-gray-700">
      {label}
      {required && <span className="text-red-600"> *</span>}
    </label>
    {children}
  </div>
);

const inputClass = 'block min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base text-gray-950 outline-none transition focus:border-black focus:ring-2 focus:ring-black/15 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';
const selectClass = 'block min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base text-gray-950 outline-none transition focus:border-black focus:ring-2 focus:ring-black/15 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';

const ParentSection = ({ title, parentKey, form, readOnly, handleChange }) => {
  const parent = form[parentKey];
  const status = parent.employmentStatus;
  const unavailable = ['deceased', 'unknown', 'na'].includes(status);

  return (
    <Section title={title}>
      <Field label={`${title} full name`} required={!unavailable && Boolean(status)}>
        <input
          className={inputClass}
          name={`${parentKey}.fullName`}
          value={parent.fullName}
          onChange={handleChange}
          disabled={readOnly}
          placeholder="Full name"
        />
      </Field>
      <Field label={`${title} date of birth`}>
        <input
          className={inputClass}
          name={`${parentKey}.dob`}
          type="date"
          value={parent.dob}
          onChange={handleChange}
          disabled={readOnly}
        />
      </Field>
      <Field label={`${title} age`}>
        <input className={inputClass} value={calculateAge(parent.dob)} disabled readOnly placeholder="Auto-calculated" />
      </Field>
      <Field label={`${title} contact number`}>
        <input
          className={inputClass}
          name={`${parentKey}.contact`}
          value={parent.contact}
          onChange={handleChange}
          disabled={readOnly || unavailable}
          placeholder="Contact number"
        />
      </Field>
      <Field label={`${title} occupation`}>
        <input
          className={inputClass}
          name={`${parentKey}.occupation`}
          value={parent.occupation}
          onChange={handleChange}
          disabled={readOnly || unavailable}
          placeholder="Occupation"
        />
      </Field>
      <Field label={`${title} employment status`} required>
        <select
          className={selectClass}
          name={`${parentKey}.employmentStatus`}
          value={parent.employmentStatus}
          onChange={handleChange}
          disabled={readOnly}
        >
          <option value="">Select status</option>
          {EMPLOYMENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </Field>
      <Field label={`${title} monthly income range`}>
        <select
          className={selectClass}
          name={`${parentKey}.monthlyIncomeRange`}
          value={parent.monthlyIncomeRange}
          onChange={handleChange}
          disabled={readOnly || unavailable}
        >
          <option value="">Select income range</option>
          {INCOME_RANGES.map((range) => (
            <option key={range} value={range}>{range}</option>
          ))}
        </select>
      </Field>
    </Section>
  );
};

export default function VerificationProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const status = user?.verificationStatus;
  const readOnly = status === 'pending' || status === 'verified';

  const [form, setForm] = useState({
    name: user?.name || '',
    dateOfBirth: toDateInput(user?.dateOfBirth),
    contactNo: user?.contactNo || '',
    email: user?.email || '',
    address: user?.address || '',
    barangay: user?.barangay || '',
    studentID: user?.studentID || '',
    course: user?.course || '',
    yearLevel: user?.yearLevel ?? '',
    school: user?.school || '',
    father: { ...emptyParent(), ...user?.father },
    mother: { ...emptyParent(), ...user?.mother },
    household: { ...emptyHousehold(), ...user?.household },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, field] = name.split('.');
      setForm((prev) => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validate = () => {
    const errors = [];

    requiredFields.forEach((field) => {
      if (!String(form[field] || '').trim()) {
        errors.push('Please complete all required personal and student information.');
      }
    });

    if (form.dateOfBirth && new Date(form.dateOfBirth) > new Date()) {
      errors.push('Your date of birth cannot be in the future.');
    }

    if (form.yearLevel !== '' && !isPositiveInteger(form.yearLevel)) {
      errors.push('Year level must be a positive whole number.');
    }

    if (form.contactNo && !contactPattern.test(form.contactNo.trim())) {
      errors.push('Contact number looks invalid. Use digits only, optionally starting with +63.');
    }

    ['father', 'mother'].forEach((parentKey) => {
      const parent = form[parentKey];
      const statusValue = parent.employmentStatus;
      const hasContent = PARENT_KEYS.some((key) => String(parent[key] || '').trim());

      if (statusValue && !EMPLOYMENT_STATUSES.includes(statusValue)) {
        errors.push(`Invalid employment status for ${parentKey}.`);
      }

      if (parent.dob && new Date(parent.dob) > new Date()) {
        errors.push(`${parentKey === 'father' ? "Father's" : "Mother's"} date of birth cannot be in the future.`);
      }

      if (hasContent && !statusValue) {
        errors.push(`Select an employment status for ${parentKey === 'father' ? "father's" : "mother's"} information.`);
      }

      if (['employed', 'working_abroad'].includes(statusValue)) {
        if (!parent.fullName.trim()) errors.push(`Enter ${parentKey === 'father' ? "father's" : "mother's"} full name.`);
        if (!parent.occupation.trim()) errors.push(`Enter ${parentKey === 'father' ? "father's" : "mother's"} occupation.`);
        if (!parent.monthlyIncomeRange) errors.push(`Select ${parentKey === 'father' ? "father's" : "mother's"} monthly income range.`);
      } else if (statusValue === 'unemployed' && !parent.fullName.trim()) {
        errors.push(`Enter ${parentKey === 'father' ? "father's" : "mother's"} full name.`);
      }
    });

    const household = form.household;
    if (!isPositiveInteger(household.memberCount)) {
      errors.push('Household member count must be a positive whole number.');
    }
    if (!isNonNegativeInteger(household.dependentsCount)) {
      errors.push('Dependents or siblings count must be a non-negative whole number.');
    }
    if (!isNonNegativeInteger(household.currentlyStudyingCount)) {
      errors.push('Number currently studying must be a non-negative whole number.');
    }
    if (!household.monthlyIncomeRange) {
      errors.push('Select a household monthly income range.');
    }
    if (!household.primaryIncomeSource.trim()) {
      errors.push('Enter the household primary income source.');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const errors = validate();
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }

    setLoading(true);
    try {
      await submitVerificationProfile({
        ...form,
        yearLevel: Number(form.yearLevel),
        household: {
          ...form.household,
          memberCount: Number(form.household.memberCount),
          dependentsCount: form.household.dependentsCount === '' ? undefined : Number(form.household.dependentsCount),
          currentlyStudyingCount: form.household.currentlyStudyingCount === '' ? undefined : Number(form.household.currentlyStudyingCount),
        },
      });
      await refreshUser();
      setSuccess('Your verification profile has been submitted. You will be redirected to your dashboard.');
      setTimeout(() => navigate('/dashboard'), 1400);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto w-full max-w-3xl px-5 py-7 sm:px-8">
        <header>
          <p className="text-sm font-semibold tracking-[0.2em] text-gray-600">FAMS</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-black">Beneficiary Verification</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            This form submits your beneficiary profile for review by FAMS administration. It is separate from your account settings.
          </p>
        </header>

        <div className="mt-6 flex flex-col gap-4">
          {status === 'incomplete' && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800" role="status">
              <p className="font-bold">Your profile needs verification.</p>
              <p className="mt-1">Complete the information below so FAMS administration can verify your beneficiary profile.</p>
            </div>
          )}
          {status === 'needs_correction' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              <p className="font-bold">Your profile needs correction.</p>
              <p className="mt-1">Please review the administrator's remarks, update the requested information, and resubmit your profile for verification.</p>
              {user?.verificationRemarks && (
                <div className="mt-3 rounded-lg border border-red-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">Administrator remarks</p>
                  <p className="mt-1 text-red-900">{user.verificationRemarks}</p>
                </div>
              )}
            </div>
          )}
          {status === 'pending' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800" role="status">
              <p className="font-bold">Your profile is awaiting verification.</p>
              <p className="mt-1">Your profile has been submitted and is currently under administrator review. The information below is read-only.</p>
            </div>
          )}
          {status === 'verified' && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800" role="status">
              <p className="font-bold">Your profile is verified.</p>
              <p className="mt-1">Your beneficiary profile has been verified by FAMS administration. The information below is read-only.</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800" role="status">
            {success}
          </div>
        )}

        <form className="mt-6 flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <Section title="Personal Information">
            <Field label="Full name" required>
              <input className={inputClass} name="name" value={form.name} onChange={handleChange} disabled={readOnly} placeholder="Full name" />
            </Field>
            <Field label="Date of birth" required>
              <input className={inputClass} name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} disabled={readOnly} />
            </Field>
            <Field label="Age">
              <input className={inputClass} value={calculateAge(form.dateOfBirth)} disabled readOnly placeholder="Auto-calculated" />
            </Field>
            <Field label="Contact number" required>
              <input className={inputClass} name="contactNo" value={form.contactNo} onChange={handleChange} disabled={readOnly} placeholder="e.g. 0917 123 4567" />
            </Field>
            <Field label="Email">
              <input className={inputClass} name="email" value={form.email} disabled readOnly placeholder="Email" />
            </Field>
            <Field label="Complete address" required>
              <input className={inputClass} name="address" value={form.address} onChange={handleChange} disabled={readOnly} placeholder="Complete address" />
            </Field>
            <Field label="Barangay" required>
              <input className={inputClass} name="barangay" value={form.barangay} onChange={handleChange} disabled={readOnly} placeholder="Barangay" />
            </Field>
          </Section>

          <Section title="Student Information">
            <Field label="Student ID" required>
              <input className={inputClass} name="studentID" value={form.studentID} onChange={handleChange} disabled={readOnly} placeholder="Student ID" />
            </Field>
            <Field label="Course / program" required>
              <input className={inputClass} name="course" value={form.course} onChange={handleChange} disabled={readOnly} placeholder="Course or program" />
            </Field>
            <Field label="Year level" required>
              <input className={inputClass} name="yearLevel" type="number" min="1" value={form.yearLevel} onChange={handleChange} disabled={readOnly} placeholder="Year level" />
            </Field>
            <Field label="School" required>
              <input className={inputClass} name="school" value={form.school} onChange={handleChange} disabled={readOnly} placeholder="School" />
            </Field>
          </Section>

          <ParentSection title="Father's Information" parentKey="father" form={form} readOnly={readOnly} handleChange={handleChange} />
          <ParentSection title="Mother's Information" parentKey="mother" form={form} readOnly={readOnly} handleChange={handleChange} />

          <Section title="Household Information">
            <Field label="Household member count" required>
              <input className={inputClass} name="household.memberCount" type="number" min="1" value={form.household.memberCount} onChange={handleChange} disabled={readOnly} placeholder="Total members" />
            </Field>
            <Field label="Dependents / siblings count">
              <input className={inputClass} name="household.dependentsCount" type="number" min="0" value={form.household.dependentsCount} onChange={handleChange} disabled={readOnly} placeholder="Dependents or siblings" />
            </Field>
            <Field label="Number currently studying">
              <input className={inputClass} name="household.currentlyStudyingCount" type="number" min="0" value={form.household.currentlyStudyingCount} onChange={handleChange} disabled={readOnly} placeholder="Currently studying" />
            </Field>
            <Field label="Household monthly income range" required>
              <select className={selectClass} name="household.monthlyIncomeRange" value={form.household.monthlyIncomeRange} onChange={handleChange} disabled={readOnly}>
                <option value="">Select income range</option>
                {INCOME_RANGES.map((range) => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </Field>
            <Field label="Primary income source" required>
              <input className={inputClass} name="household.primaryIncomeSource" value={form.household.primaryIncomeSource} onChange={handleChange} disabled={readOnly} placeholder="e.g. Father's salary, farming" />
            </Field>
            <Field label="Secondary income source">
              <input className={inputClass} name="household.secondaryIncomeSource" value={form.household.secondaryIncomeSource} onChange={handleChange} disabled={readOnly} placeholder="Optional" />
            </Field>
          </Section>

          {!readOnly && (
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-black px-6 text-base font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Submitting…' : 'Submit profile for verification'}
            </button>
          )}
          {readOnly && (
            <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
              This profile has already been {status === 'pending' ? 'submitted for review' : 'verified'}. Editing is disabled.
            </p>
          )}
        </form>
      </div>
      <StudentBottomNav />
    </main>
  );
}
