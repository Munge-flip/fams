import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { confirmVerificationCode, getEmailVerificationStatus, requestEmailVerification } from '../../services/authService';

const inputClass = 'mt-2 block min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-center text-lg font-bold tracking-[0.3em] outline-none focus:border-black focus:ring-2 focus:ring-black/15 disabled:bg-gray-100';
const primaryButtonClass = 'min-h-11 w-full rounded-lg bg-black px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClass = 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-5 text-sm font-bold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60';

// Activation step for beneficiary accounts. An unconfirmed account cannot sign in at all, so
// this screen is reached straight after registering and again whenever a sign-in is refused —
// the browser holds the activation ticket, and no session, until the code is entered.
// Everything it shows comes from the server, so a reload — or a failed send — tells the
// truth instead of claiming a code is on its way.
export default function VerifyEmail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(state?.email || '');

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const [deliveryFailed, setDeliveryFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const response = await getEmailVerificationStatus();
        if (cancelled) return;

        const { email: address, pending, deliveryFailed: failed, resendAfterSeconds } = response.data || {};
        const who = address || 'your email address';
        if (address) setEmail(address);
        setCooldown(resendAfterSeconds || 0);
        setDeliveryFailed(Boolean(failed));

        if (failed) {
          setNotice('');
          setError(`We could not send your verification email to ${who} yet. Send a new code below to try again.`);
          return;
        }

        if (pending) {
          setNotice(`We sent a 6-digit code to ${who}.`);
          return;
        }

        setError(`We don't have a code waiting for ${who}. Send a new one to finish activating your account.`);
      } catch (requestFailure) {
        // Without a valid activation session there is nothing to look up, resend or confirm.
        // The honest answer is the sign-in screen, which issues a fresh one.
        if (cancelled) return;

        const status = requestFailure.response?.status;
        if (status === 401 || status === 400) {
          navigate('/login', {
            replace: true,
            state: { notice: 'Sign in with your email and password to get a verification code.' },
          });
        }
      }
    };

    loadStatus();
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = setInterval(() => setCooldown((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const entered = code.trim();
    if (!/^\d{6}$/.test(entered)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    try {
      setBusy(true);
      const response = await confirmVerificationCode({ code: entered });
      // The account can sign in now, and the API has already retired the activation session,
      // so the next step is the sign-in screen the user was refused at.
      navigate('/login', {
        replace: true,
        state: { email, notice: response.data?.message || 'Your email address is verified. Sign in to continue.' },
      });
    } catch (requestFailure) {
      setError(requestFailure.response?.data?.message || 'We could not verify that code. Please try again.');
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');

    try {
      setBusy(true);
      const response = await requestEmailVerification();
      setCode('');
      setDeliveryFailed(false);
      setCooldown(response.data?.resendAfterSeconds || 0);
      setNotice(response.data?.message || `We sent a new 6-digit code to ${email || 'your email address'}.`);
      setSuccess('A new code is on its way. The previous code no longer works.');
    } catch (requestFailure) {
      const payload = requestFailure.response?.data;
      const waitFor = payload?.data?.resendAfterSeconds;
      if (waitFor) setCooldown(waitFor);
      setDeliveryFailed(true);
      setNotice('');
      setError(payload?.message || 'We could not send a new code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto w-full max-w-md px-5 py-8 sm:px-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold tracking-[0.16em] text-gray-500">FAMS</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-black">Verify your email</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Confirm that <span className="font-semibold text-gray-800">{email || 'your email address'}</span> belongs to you.
            Signing in stays locked until it is confirmed — enter the 6-digit code we sent you to finish.
          </p>

          {notice && !error && <p className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">{notice}</p>}
          {error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          {success && <p className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{success}</p>}

          <form className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-gray-800" htmlFor="verify-code">
              Verification code
              <input
                autoComplete="one-time-code"
                className={inputClass}
                disabled={busy}
                id="verify-code"
                inputMode="numeric"
                maxLength={6}
                name="code"
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                pattern="[0-9]{6}"
                placeholder="000000"
                type="text"
                value={code}
              />
            </label>
            <button className={deliveryFailed ? secondaryButtonClass : primaryButtonClass} disabled={busy} type="submit">
              {busy ? 'Verifying…' : 'Verify email'}
            </button>
            <button
              className={deliveryFailed ? primaryButtonClass : secondaryButtonClass}
              disabled={busy || cooldown > 0}
              onClick={handleResend}
              type="button"
            >
              {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
            </button>
          </form>

          <p className="mt-6 text-sm leading-6 text-gray-600">
            No code, or it expired? Use <span className="font-semibold text-gray-800">Send a new code</span> above — you never
            have to register again.
          </p>
          <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-black underline underline-offset-4" to="/login">
            Already verified? Sign in
          </Link>
        </section>
      </div>
    </main>
  );
}
