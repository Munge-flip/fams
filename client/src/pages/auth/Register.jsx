import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'student',
  studentID: '',
  course: '',
  yearLevel: '',
  barangay: '',
  contactNo: '',
  aidCategory: '',
};

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
    };

    if (form.role === 'student') {
      if (form.studentID.trim()) payload.studentID = form.studentID.trim();
      if (form.course.trim()) payload.course = form.course.trim();
      if (form.yearLevel) payload.yearLevel = Number(form.yearLevel);
    } else {
      if (form.barangay.trim()) payload.barangay = form.barangay.trim();
      if (form.contactNo.trim()) payload.contactNo = form.contactNo.trim();
      if (form.aidCategory.trim()) payload.aidCategory = form.aidCategory.trim();
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Name, email, and password are required.');
      return;
    }

    const reqs = {
      length: form.password.length >= 8,
      upper: /[A-Z]/.test(form.password),
      lower: /[a-z]/.test(form.password),
      number: /[0-9]/.test(form.password),
      special: /[^A-Za-z0-9]/.test(form.password),
    };
    if (!Object.values(reqs).every(Boolean)) {
      setError('Your password does not meet the minimum requirements.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('The passwords you entered do not match.');
      return;
    }

    if (form.yearLevel && (!Number.isInteger(Number(form.yearLevel)) || Number(form.yearLevel) < 1)) {
      setError('Year level must be a positive whole number.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await register(buildPayload());
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8 sm:px-8">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold tracking-[0.2em] text-gray-600">FAMS</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-black">Create your account</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">Register as a student or barangay resident.</p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          <fieldset disabled={submitting}>
            <legend className="text-sm font-medium text-gray-900">I am registering as a</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {['student', 'resident'].map((role) => (
                <label className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-semibold capitalize ${form.role === role ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-800'}`} key={role}>
                  <input className="sr-only" type="radio" name="role" value={role} checked={form.role === role} onChange={handleChange} />
                  {role}
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Full name" name="name" value={form.name} onChange={handleChange} disabled={submitting} autoComplete="name" placeholder="e.g., Juan Dela Cruz" />
          <Field label="Email address" name="email" type="email" value={form.email} onChange={handleChange} disabled={submitting} autoComplete="email" placeholder="e.g., juan@example.com" />

          {form.role === 'student' ? (
            <div className="space-y-5 rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Student profile <span className="font-normal text-gray-500">(optional)</span></p>
              <Field label="Student ID" name="studentID" value={form.studentID} onChange={handleChange} disabled={submitting} placeholder="e.g., 2021-00123" />
              <Field label="Course" name="course" value={form.course} onChange={handleChange} disabled={submitting} placeholder="e.g., BS Information Technology" />
              <Field label="Year level" name="yearLevel" type="number" min="1" step="1" value={form.yearLevel} onChange={handleChange} disabled={submitting} placeholder="e.g., 2" />
            </div>
          ) : (
            <div className="space-y-5 rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Resident profile <span className="font-normal text-gray-500">(optional)</span></p>
              <Field label="Barangay" name="barangay" value={form.barangay} onChange={handleChange} disabled={submitting} placeholder="e.g., Washington" />
              <Field label="Contact number" name="contactNo" type="tel" value={form.contactNo} onChange={handleChange} disabled={submitting} autoComplete="tel" placeholder="e.g., 0917 123 4567" />
              <label className="block text-sm font-medium text-gray-900" htmlFor="aidCategory">
                Aid category
                <select
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-950 outline-none transition focus:border-black focus:ring-2 focus:ring-black/15 disabled:bg-gray-100"
                  id="aidCategory"
                  name="aidCategory"
                  value={form.aidCategory}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  <option value="">Select a category</option>
                  <option value="scholarship">Scholarship</option>
                  <option value="barangay">Barangay</option>
                  <option value="emergency">Emergency</option>
                </select>
              </label>
            </div>
          )}

          <PasswordField label="Password" name="password" value={form.password} onChange={handleChange} disabled={submitting} showRequirements={true} />
          <PasswordField label="Confirm password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} disabled={submitting} />
          <button className="w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">Already have an account? <Link className="font-semibold text-black underline underline-offset-4" to="/login">Sign in</Link></p>
      </section>
    </main>
  );
}

function PasswordField({ label, name, value, onChange, disabled, showRequirements }) {
  const [show, setShow] = useState(false);

  const reqs = {
    length: value.length >= 8,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  };

  const score = Object.values(reqs).filter(Boolean).length;
  const strength = score === 0 ? 'None' : score <= 2 ? 'Weak' : score <= 4 ? 'Fair' : 'Strong';
  const strengthColor = score === 0 ? 'bg-gray-200' : score <= 2 ? 'bg-red-500' : score <= 4 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="block">
      <div className="flex items-center justify-between text-sm font-medium text-gray-900">
        <label htmlFor={name}>{label}</label>
        <button type="button" className="text-xs text-gray-500 underline focus:outline-none" onClick={() => setShow(!show)}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <input
        className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-950 outline-none transition focus:border-black focus:ring-2 focus:ring-black/15 disabled:bg-gray-100"
        id={name}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete={name === 'password' || name === 'confirmPassword' ? 'new-password' : 'off'}
      />
      {showRequirements && (
        <div className="mt-4 space-y-2">
          <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex-1 ${score >= i ? strengthColor : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="text-xs font-semibold text-gray-700">Password strength: {strength}</p>
          <ul className="text-xs space-y-1 mt-2 text-gray-600">
            <li className={`flex gap-2 ${reqs.length ? 'text-green-700 font-semibold' : ''}`}><span>{reqs.length ? '✓' : '○'}</span> <span>At least 8 characters</span></li>
            <li className={`flex gap-2 ${reqs.upper ? 'text-green-700 font-semibold' : ''}`}><span>{reqs.upper ? '✓' : '○'}</span> <span>At least one uppercase letter</span></li>
            <li className={`flex gap-2 ${reqs.lower ? 'text-green-700 font-semibold' : ''}`}><span>{reqs.lower ? '✓' : '○'}</span> <span>At least one lowercase letter</span></li>
            <li className={`flex gap-2 ${reqs.number ? 'text-green-700 font-semibold' : ''}`}><span>{reqs.number ? '✓' : '○'}</span> <span>At least one number</span></li>
            <li className={`flex gap-2 ${reqs.special ? 'text-green-700 font-semibold' : ''}`}><span>{reqs.special ? '✓' : '○'}</span> <span>At least one special character</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, name, type = 'text', ...inputProps }) {
  return (
    <label className="block text-sm font-medium text-gray-900" htmlFor={name}>
      {label}
      <input
        className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-950 outline-none transition focus:border-black focus:ring-2 focus:ring-black/15 disabled:bg-gray-100"
        id={name}
        name={name}
        type={type}
        {...inputProps}
      />
    </label>
  );
}
