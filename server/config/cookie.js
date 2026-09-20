// How long an activation ticket lives. It only has to outlive one verification round trip,
// and the next sign-in attempt issues a fresh one, so it stays deliberately short.
const VERIFICATION_TICKET_MINUTES = 60;

const cookieOptions = () => {
  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE || 7);

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
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
