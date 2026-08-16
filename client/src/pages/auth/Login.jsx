import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const initialForm = { identifier: '', password: '' };

export default function Login() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.identifier.trim() || !form.password) {
      setError('Enter your email or student ID and password.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login({ identifier: form.identifier.trim(), password: form.password });
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-10 sm:px-8">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold tracking-[0.2em] text-gray-600">FAMS</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-black">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">Sign in to manage your financial assistance account.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          <label className="block text-sm font-medium text-gray-900" htmlFor="identifier">
            Email or student ID
            <input
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-950 outline-none transition focus:border-black focus:ring-2 focus:ring-black/15"
              id="identifier"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
              autoComplete="username"
              disabled={submitting}
            />
          </label>
          <label className="block text-sm font-medium text-gray-900" htmlFor="password">
            Password
            <input
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-950 outline-none transition focus:border-black focus:ring-2 focus:ring-black/15"
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={submitting}
            />
          </label>
          <button className="w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">New to FAMS? <Link className="font-semibold text-black underline underline-offset-4" to="/register">Create an account</Link></p>
      </section>
    </main>
  );
}
