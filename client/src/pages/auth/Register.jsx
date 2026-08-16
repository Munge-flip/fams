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
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
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

          <Field label="Full name" name="name" value={form.name} onChange={handleChange} disabled={submitting} autoComplete="name" />
          <Field label="Email address" name="email" type="email" value={form.email} onChange={handleChange} disabled={submitting} autoComplete="email" />

          {form.role === 'student' ? (
            <div className="space-y-5 rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Student profile <span className="font-normal text-gray-500">(optional)</span></p>
              <Field label="Student ID" name="studentID" value={form.studentID} onChange={handleChange} disabled={submitting} />
              <Field label="Course" name="course" value={form.course} onChange={handleChange} disabled={submitting} />
              <Field label="Year level" name="yearLevel" type="number" min="1" step="1" value={form.yearLevel} onChange={handleChange} disabled={submitting} />
            </div>
          ) : (
            <div className="space-y-5 rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Resident profile <span className="font-normal text-gray-500">(optional)</span></p>
              <Field label="Barangay" name="barangay" value={form.barangay} onChange={handleChange} disabled={submitting} />
              <Field label="Contact number" name="contactNo" type="tel" value={form.contactNo} onChange={handleChange} disabled={submitting} autoComplete="tel" />
              <Field label="Aid category" name="aidCategory" value={form.aidCategory} onChange={handleChange} disabled={submitting} />
            </div>
          )}

          <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} disabled={submitting} autoComplete="new-password" />
          <Field label="Confirm password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} disabled={submitting} autoComplete="new-password" />
          <button className="w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">Already have an account? <Link className="font-semibold text-black underline underline-offset-4" to="/login">Sign in</Link></p>
      </section>
    </main>
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
