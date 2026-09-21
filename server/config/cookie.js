// How long an activation ticket lives. It only has to outlive one verification round trip,
// and the next sign-in attempt issues a fresh one, so it stays deliberately short.
const VERIFICATION_TICKET_MINUTES = 60;

const cookieOptions = () => {
  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE || 7);
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    // Deployment-ready: in production the client sits on a different site (Vercel) than this
    // API (Render), and browsers only attach a cross-site cookie when it is SameSite=None.
    // Local development serves both on the same site over http, where 'lax' is sufficient and
    // safer, so the default follows NODE_ENV. Override with COOKIE_SAME_SITE when the two
    // origins end up on the same registrable domain (then 'lax' works in production too).
    // 'none' is only honoured by browsers together with the Secure flag set below.
    sameSite: process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax'),
    secure: isProduction,
    maxAge: cookieExpireDays * 24 * 60 * 60 * 1000,
    path: '/',
  };
};

// An account whose email is unconfirmed holds no session: this ticket opens the verification
// endpoints and nothing else.
const verificationCookieOptions = () => ({
  ...cookieOptions(),
  maxAge: VERIFICATION_TICKET_MINUTES * 60 * 1000,
});

// clearCookie has to repeat the attributes (minus the lifetime) so the browser matches the
// cookie it is being asked to drop.
const clearedCookieOptions = (options) => {
  const cleared = { ...options };
  delete cleared.maxAge;
  return cleared;
};

module.exports = { VERIFICATION_TICKET_MINUTES, clearedCookieOptions, cookieOptions, verificationCookieOptions };
