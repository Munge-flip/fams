import { Link } from 'react-router-dom';
import EmailChangeForm from '../../components/EmailChangeForm';
import PasswordChangeForm from '../../components/PasswordChangeForm';
import RecoveryEmailForm from '../../components/RecoveryEmailForm';
import StudentBottomNav from '../../components/StudentBottomNav';
import { useAuth } from '../../context/AuthContext';

const sectionClass = 'rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6';
const headingClass = 'text-lg font-bold tracking-tight text-black';
const sectionCopyClass = 'mt-1 max-w-2xl text-sm leading-6 text-gray-600';

// One account-and-security surface for every role: the admin route renders it inside
// AdminLayout, the beneficiary route adds its own chrome and bottom navigation.
export default function Settings({ withBottomNav = false }) {
  const { refreshUser, user } = useAuth();

  const content = (
    <>
      <section>
        <p className="text-xs font-bold tracking-[0.16em] text-gray-500">{withBottomNav ? 'FAMS' : 'ADMINISTRATION'}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-black">Account &amp; security</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Manage the email addresses and the password you use to sign in. Changes here apply immediately.
        </p>
        {withBottomNav && (
          <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-black underline" to="/profile">
            Back to profile
          </Link>
        )}
      </section>

      <section aria-labelledby="settings-email-heading" className={`mt-6 ${sectionClass}`}>
        <h2 className={headingClass} id="settings-email-heading">Primary email</h2>
        <p className={sectionCopyClass}>
          Signed in as <span className="font-semibold text-gray-800">{user?.email || 'Email not available'}</span>. Changing it
          requires your current password and a 6-digit code sent to the new address.
        </p>
        <EmailChangeForm currentEmail={user?.email} onChanged={refreshUser} />
      </section>

      <section aria-labelledby="settings-recovery-heading" className={`mt-6 ${sectionClass}`}>
        <h2 className={headingClass} id="settings-recovery-heading">Recovery email</h2>
        <p className={sectionCopyClass}>
          An optional backup address we can reach you at. It never changes how you sign in, and you can remove it anytime.
        </p>
        <RecoveryEmailForm onChanged={refreshUser} recoveryEmail={user?.recoveryEmail} />
      </section>

      <section aria-labelledby="settings-password-heading" className={`mt-6 ${sectionClass}`}>
        <h2 className={headingClass} id="settings-password-heading">Password</h2>
        <p className={sectionCopyClass}>Choose a new password. You stay signed in on this device after saving.</p>
        <PasswordChangeForm />
      </section>
    </>
  );

  if (!withBottomNav) {
    return content;
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-28">
      <div className="mx-auto w-full max-w-3xl px-5 py-7 sm:px-8">{content}</div>
      <StudentBottomNav />
    </main>
  );
}
