const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// An account that still owes an email confirmation is not a beneficiary with limited
// access — it has no access at all, because it cannot sign in. Administrators are created
// without the emailVerified field, so only an explicit false ever counts.
const isUnconfirmedBeneficiary = (user) => user.role !== 'admin' && user.emailVerified === false;

const unconfirmed = (res, user) => res.status(401).json({
  success: false,
  message: 'Please verify your email before signing in.',
  // Enough for the client to send the user straight to the verification step.
  data: { code: 'email_unverified', email: user.email },
});

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies.fams_token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication is required.' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ success: false, message: 'JWT_SECRET is not configured.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // An activation ticket is not a session, even if it is dropped into this cookie.
    if (decoded.purpose) {
      return res.status(401).json({ success: false, message: 'Authentication token is invalid or expired.' });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'The authenticated user no longer exists.' });
    }

    // Unconfirmed accounts hold no session. This also retires any cookie issued before
    // sign-in was gated, so the confirmation step is the only way forward.
    if (isUnconfirmedBeneficiary(user)) {
      return unconfirmed(res, user);
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Authentication token is invalid or expired.' });
  }
});

// The verification endpoints are all an unconfirmed account can reach, and they open on the
// activation ticket: issued at registration and whenever a sign-in is refused. Codes can
// therefore only be requested and confirmed by someone who proved the password — never by
// anyone who merely types an address.
const protectActivationTicket = asyncHandler(async (req, res, next) => {
  const ticket = req.cookies.fams_verify;

  if (!ticket) {
    return res.status(401).json({ success: false, message: 'Sign in to get a verification code.' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ success: false, message: 'JWT_SECRET is not configured.' });
  }

  try {
    const decoded = jwt.verify(ticket, process.env.JWT_SECRET);

    if (decoded.purpose !== 'email_verification') {
      return res.status(401).json({ success: false, message: 'This verification session is invalid or expired. Sign in to get a new code.' });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'The account for this verification session no longer exists.' });
    }

    if (!isUnconfirmedBeneficiary(user)) {
      return res.status(400).json({ success: false, message: 'Your email address is already confirmed. Sign in instead.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'This verification session is invalid or expired. Sign in to get a new code.' });
  }
});

// One confirm endpoint serves both account activation (ticket) and email changes (session).
// The ticket wins when both cookies are present: a beneficiary who activated the account in
// another tab must not be stranded by the session cookie they held before the rule changed.
const protectConfirmation = (req, res, next) => (
  req.cookies.fams_verify ? protectActivationTicket(req, res, next) : protect(req, res, next)
);

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
  }

  next();
};

module.exports = { protect, protectActivationTicket, protectConfirmation, authorize };
