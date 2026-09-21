const { ipKeyGenerator, rateLimit } = require('express-rate-limit');
const User = require('../models/User');

// Limits for the account endpoints, as a second layer on top of the per-account rules already
// inside authController (one code per 60 seconds, five wrong codes per record, fifteen-minute
// expiry).
//
// Two keys, because the two groups of endpoints defend against different things:
//   * Sign-in is keyed on the account being attacked, so ten bad guesses against one account do
//     not lock out everyone else behind the same school network, barangay office or shared
//     terminal.
//   * Registration and the verification-code endpoints are keyed on the connection, because what
//     they stop is one source mass-creating accounts or burning through sends — no individual
//     account can be harmed by somebody else's attempts there.
//
// Read-only browsing is deliberately unthrottled, so the limiters are attached to individual
// auth routes instead of the whole application.
//
// The default in-memory store counts per process and forgets everything on restart. That is
// enough for one instance; a multi-instance deployment would need a shared store.

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const createLimiter = ({ windowMs, limit, message, skipSuccessfulRequests = false, keyGenerator }) => rateLimit({
  windowMs,
  limit,
  // Standard RateLimit-* headers, without the deprecated X-RateLimit-* pair.
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests,
  keyGenerator,
  // Same envelope as every other endpoint, so the client shows this sentence the way it shows
  // any other API message.
  message: { success: false, message },
});

// The sign-in key is the account behind the submitted identifier, resolved once per attempt.
// Keying on the identifier as typed would hand out a second allowance to anyone who alternates
// between a student's email address and their student ID, so the lookup mirrors the one the
// sign-in handler already performs — same normalization, same $or — and keys on the account's
// id instead. It reads the id and nothing else: whether the account exists never reaches the
// response, which is why a limited sign-in reads the same for a real address and an invented
// one, and why both are allowed exactly the same number of attempts.
//
// Identifier forms that resolve to no single account — an invented address, or an ambiguous one
// the handler refuses outright without checking a password — still have to be counted, or
// probing would be the one thing left unlimited. They share a bucket per normalized identifier.
//
// A request with no usable identifier, or one whose lookup fails (the request is going to fail
// on the same database outage anyway), falls back to the caller's address. Every kind of key
// carries its own namespace so two of them can never collide.
const loginKey = async (req) => {
  const identifier = req.body?.identifier;

  if (typeof identifier !== 'string' || !identifier.trim()) {
    return `ip:${ipKeyGenerator(req.ip)}`;
  }

  const normalized = identifier.trim().toLowerCase();

  try {
    const account = await User.findOne({
      $or: [
        { email: normalized },
        { role: 'student', studentID: identifier.trim() },
      ],
    }).select('_id').lean();

    return account ? `account:${account._id}` : `unknown:${normalized}`;
  } catch (error) {
    console.error(`Unable to resolve the sign-in rate limit key: ${error.message}`);
    return `unknown:${normalized}`;
  }
};

// Sign-in: an honest typo costs nothing (only failed attempts are counted), and an automated
// password guess costs a fifteen-minute wait for the account being guessed at.
const loginLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: loginKey,
  message: 'Too many sign-in attempts. Please try again in a few minutes.',
});

// Registration: five new accounts per hour is more than any real household needs, and it stops
// mass fake-account creation.
const registerLimiter = createLimiter({
  windowMs: ONE_HOUR,
  limit: 5,
  message: 'Too many registration attempts. Please try again later.',
});

// Every endpoint that mails a 6-digit code shares one counter, so cycling through activation
// resend, email change, recovery email and password change cannot buy extra sends. Ten an hour
// leaves room for the resends a mistyped address legitimately needs.
const verificationCodeRequestLimiter = createLimiter({
  windowMs: ONE_HOUR,
  limit: 10,
  message: 'Too many verification code requests. Please try again later.',
});

// Backstop for guessing a code across many accounts; the five-attempt cap per pending record
// still applies on top of this.
const verificationConfirmLimiter = createLimiter({
  windowMs: ONE_HOUR,
  limit: 20,
  message: 'Too many code attempts. Please try again later.',
});

module.exports = {
  loginLimiter,
  registerLimiter,
  verificationCodeRequestLimiter,
  verificationConfirmLimiter,
};
